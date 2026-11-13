import { Store } from './store.mjs';
import { randomToken, hashToken, encrypt, decrypt, parseCookie, sessionCookie } from './security.mjs';
import { emailConfigured, sendSignIn } from './email.mjs';
import { authorizationUrl, exchangeCode, listLocations, revokeToken, verifyWebhook } from './square.mjs';
import { renewConnection } from './renewal.mjs';

const DAY = 86400000;
const POST_ROUTES = new Set(['sign-in','verify','logout','restaurant','square/connect','square/location','square/disconnect','square/webhook']);
const GET_ROUTES = new Set(['me','square/locations','square/callback']);
const PUBLIC_ERRORS = new Set(['configuration_unavailable','email_unavailable','rate_limited','invalid_email','invalid_link','invalid_request','invalid_restaurant','forbidden','authentication_required','square_unavailable','square_reconnect_required','merchant_already_connected','merchant_mismatch','connection_busy','invalid_location','restaurant_required','not_found','method_not_allowed','request_too_large','connection_required']);
function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }); }
function reply(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function canonicalOrigin(env) {
  try {
    const url = new URL(env.APP_ORIGIN);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) fail('configuration_unavailable', 503);
    return url.origin;
  } catch { fail('configuration_unavailable', 503); }
}
async function readBody(request, json = true) {
  if (Number(request.headers.get('Content-Length')) > 16384) fail('request_too_large', 413);
  if (json && !request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) fail('invalid_request', 415);
  const reader = request.body?.getReader(); let size = 0; const chunks = [];
  if (reader) {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 16384) { await reader.cancel(); fail('request_too_large', 413); }
      chunks.push(value);
    }
  }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  const text = new TextDecoder().decode(data);
  if (!json) return text;
  try { const value = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_request'); return value; }
  catch { fail('invalid_request'); }
}
function publicConnection(connection, now) {
  if (!connection) return null;
  let status = connection.status;
  if (status === 'connected' && (connection.expires_at <= now || now - connection.renewed_at > 8 * DAY)) status = 'renewal_failed';
  return { status, location_id: connection.location_id, verified_at: connection.verified_at, renewed_at: connection.renewed_at };
}
async function authenticate(request, store, now) {
  const token = parseCookie(request.headers.get('Cookie'));
  const session = token ? await store.session(await hashToken(token), now) : null;
  if (!session) fail('authentication_required', 401);
  return session;
}
async function activeConnection(env, store, account, now, fetcher) {
  let connection = await store.connection(account);
  if (!connection?.token_cipher || connection.status === 'disconnected') fail('connection_required', 409);
  if (connection.status === 'disconnecting') fail('connection_busy', 409);
  await renewConnection(env, store, connection, now, fetcher);
  connection = await store.connection(account);
  if (!connection?.token_cipher || connection.status === 'reconnect_required') fail('square_reconnect_required', 409);
  if (connection.status !== 'connected') fail('square_unavailable', 503);
  return connection;
}
async function checkedLocations(env, store, connection, now, fetcher) {
  try {
    const tokens = JSON.parse(await decrypt(connection.token_cipher, env.TOKEN_ENCRYPTION_KEY));
    const locations = await listLocations(env, tokens.access_token, fetcher);
    await store.markVerified(connection.account_id, connection.version, now);
    return locations;
  } catch (error) {
    if (error.code === 'square_reconnect_required') {
      await store.markStatus(connection.account_id, connection.version, 'reconnect_required');
      fail('square_reconnect_required', 409);
    }
    if (error.code === 'configuration_unavailable') throw error;
    fail('square_unavailable', 503);
  }
}

export async function handleAccount(request, env, options = {}) {
  const now = options.now ?? Date.now(); const fetcher = options.fetcher || fetch;
  try {
    if (!env.ACCOUNT_DB) fail('configuration_unavailable', 503);
    const origin = canonicalOrigin(env); const url = new URL(request.url);
    if (url.origin !== origin) fail('forbidden', 403);
    const route = url.pathname.replace(/^\/api\/account\/?/, '').replace(/\/$/, '');
    if (!POST_ROUTES.has(route) && !GET_ROUTES.has(route)) fail('not_found', 404);
    if (!(request.method === 'POST' && POST_ROUTES.has(route)) && !(request.method === 'GET' && GET_ROUTES.has(route))) fail('method_not_allowed', 405);
    if (request.method === 'POST' && route !== 'square/webhook' && request.headers.get('Origin') !== origin) fail('forbidden', 403);
    const store = new Store(env.ACCOUNT_DB);
    if (route === 'square/webhook') {
      const raw = await readBody(request, false);
      if (!(await verifyWebhook(env, raw, request.headers.get('x-square-hmacsha256-signature')))) fail('forbidden', 403);
      let event; try { event = JSON.parse(raw); } catch { fail('invalid_request'); }
      if (event.type === 'oauth.authorization.revoked') {
        if (typeof event.merchant_id !== 'string' || !event.merchant_id) fail('invalid_request');
        const revokedAt = Date.parse(event.data?.object?.revocation?.revoked_at || event.created_at);
        if (!Number.isFinite(revokedAt)) fail('invalid_request');
        await store.revokeMerchant(event.merchant_id, revokedAt);
      }
      return reply({ ok: true });
    }
    if (route === 'sign-in') {
      const body = await readBody(request);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) fail('invalid_email');
      if (!emailConfigured(env)) fail('configuration_unavailable', 503);
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      if (!(await store.rateLimit(`email:${await hashToken(email)}`, 5, 15 * 60000, now)) || !(await store.rateLimit(`signin-ip:${await hashToken(ip)}`, 20, 15 * 60000, now))) fail('rate_limited', 429);
      const token = randomToken(); const hash = await hashToken(token); const locale = body.locale === 'zh' ? 'zh' : 'en';
      await store.createChallenge(hash, email, locale, now + 15 * 60000, now);
      try { await sendSignIn(env, email, `${origin}${locale === 'zh' ? '/zh' : ''}/account/#token=${token}`, locale, fetcher); }
      catch (error) { await store.deleteChallenge(hash); throw error; }
      return reply({ ok: true });
    }
    if (route === 'verify') {
      const ip = request.headers.get('CF-Connecting-IP') || 'local';
      if (!(await store.rateLimit(`verify:${await hashToken(ip)}`, 60, 15 * 60000, now))) fail('rate_limited', 429);
      const body = await readBody(request);
      if (!/^[A-Za-z0-9_-]{43}$/.test(body.token || '')) fail('invalid_link');
      const challenge = await store.consumeChallenge(await hashToken(body.token), now);
      if (!challenge) fail('invalid_link');
      const token = randomToken(); const hash = await hashToken(token);
      await store.createSession(challenge.email, hash, now + 7 * DAY, now);
      return reply({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
    }
    if (route === 'square/callback') {
      let locale = 'en'; let outcome = 'error';
      try {
        const session = await authenticate(request, store, now);
        const state = url.searchParams.get('state');
        if (!/^[A-Za-z0-9_-]{43}$/.test(state || '')) fail('invalid_request');
        const attempt = await store.consumeOAuth(await hashToken(state), session.id, session.session_hash, now);
        if (!attempt) fail('invalid_request');
        locale = attempt.locale;
        if (url.searchParams.has('error')) outcome = 'denied';
        else {
          const code = url.searchParams.get('code'); if (!code || code.length > 4096) fail('invalid_request');
          const tokens = await exchangeCode(env, code, fetcher);
          if (Date.parse(tokens.expires_at) <= now) fail('square_unavailable', 503);
          const existing = await store.connection(session.id);
          if (existing?.merchant_id && existing.merchant_id !== tokens.merchant_id && existing.status !== 'disconnected') fail('merchant_mismatch', 409);
          await store.saveConnection(session.id, tokens.merchant_id, await encrypt(JSON.stringify(tokens), env.TOKEN_ENCRYPTION_KEY), Date.parse(tokens.expires_at), now, attempt.connection_version, session.session_hash);
          outcome = 'connected';
        }
      } catch { outcome = 'error'; }
      return new Response(null, { status: 303, headers: { Location: `${origin}${locale === 'zh' ? '/zh' : ''}/account/?square=${outcome}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    const session = await authenticate(request, store, now);
    if (route === 'logout') {
      await store.logout(session.session_hash);
      return reply({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (!(await store.rateLimit(`account:${session.id}`, 120, 60000, now))) fail('rate_limited', 429);
    if (route === 'me') {
      const restaurant = await store.restaurant(session.id);
      let connection = await store.connection(session.id);
      if (connection?.token_cipher && ['connected', 'renewal_failed'].includes(connection.status)) {
        await renewConnection(env, store, connection, now, fetcher);
        connection = await store.connection(session.id);
        if (['connected','renewal_failed'].includes(connection?.status)) {
          try { await checkedLocations(env, store, connection, now, fetcher); }
          catch (error) {
            if (error.code !== 'square_reconnect_required') await store.markStatus(session.id, connection.version, 'renewal_failed');
          }
          connection = await store.connection(session.id);
        }
      }
      let squareConfigured = false;
      try {
        authorizationUrl(env, 'configuration-check');
        await encrypt('configuration-check', env.TOKEN_ENCRYPTION_KEY);
        squareConfigured = true;
      } catch {}
      return reply({ account: { email: session.email }, restaurant, connection: publicConnection(connection, now), square_configured: squareConfigured });
    }
    if (route === 'restaurant') {
      const body = await readBody(request);
      const fields = [body.name, body.contact_name, body.phone];
      if (fields.some(value => typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) || body.name.length > 160 || body.contact_name.length > 120 || body.phone.length > 40 || !/^[+()\d .-]{7,40}$/.test(body.phone) || (body.phone.match(/\d/g) || []).length < 7) fail('invalid_restaurant');
      await store.saveRestaurant(session.id, body.name.trim(), body.contact_name.trim(), body.phone.trim(), now);
      return reply({ ok: true });
    }
    if (route === 'square/connect') {
      const body = await readBody(request);
      if (!(await store.restaurant(session.id))) fail('restaurant_required', 409);
      const existing = await store.connection(session.id);
      if (existing?.status === 'disconnecting' || existing?.lease_until > now) fail('connection_busy', 409);
      try { await encrypt('configuration-check', env.TOKEN_ENCRYPTION_KEY); } catch { fail('configuration_unavailable', 503); }
      const state = randomToken(); const redirect = authorizationUrl(env, state);
      const locale = body.locale === 'zh' || request.headers.get('Referer')?.startsWith(`${origin}/zh/account/`) ? 'zh' : 'en';
      await store.createOAuth(await hashToken(state), session.id, session.session_hash, locale, now + 10 * 60000, now);
      return reply({ url: redirect });
    }
    if (route === 'square/disconnect') {
      await readBody(request);
      await store.cancelOAuth(session.id);
      const existing = await store.connection(session.id);
      if (!existing?.token_cipher) {
        if (!(await store.clearRevokedConnection(session.id, now))) fail('connection_busy', 409);
        return reply({ ok: true });
      }
      const lease = randomToken(); const claimed = await store.beginDisconnect(session.id, lease, now);
      if (!claimed) fail('connection_busy', 409);
      try {
        const tokens = JSON.parse(await decrypt(claimed.token_cipher, env.TOKEN_ENCRYPTION_KEY));
        await revokeToken(env, tokens.access_token, fetcher);
        const completed = await store.completeDisconnect(session.id, lease);
        if (!completed && !(await store.clearRevokedConnection(session.id, now))) fail('connection_busy', 409);
      } catch (error) { await store.failDisconnect(session.id, lease); throw error; }
      return reply({ ok: true });
    }
    if (route === 'square/locations' || route === 'square/location') {
      const body = route === 'square/location' ? await readBody(request) : null;
      const connection = await activeConnection(env, store, session.id, now, fetcher);
      const locations = await checkedLocations(env, store, connection, now, fetcher);
      if (route === 'square/locations') return reply({ locations });
      if (typeof body.location_id !== 'string' || !locations.some(x => x.id === body.location_id && x.status === 'ACTIVE')) fail('invalid_location');
      if (!(await store.selectLocation(session.id, connection.merchant_id, connection.version, body.location_id, now))) fail('connection_busy', 409);
      return reply({ ok: true });
    }
    fail('not_found', 404);
  } catch (error) {
    const code = PUBLIC_ERRORS.has(error?.code) ? error.code : 'service_unavailable';
    const status = code === 'service_unavailable' ? 503 : error.status || 400;
    return reply({ error: code }, status === 401 && code === 'square_reconnect_required' ? 409 : status);
  }
}

export const SQUARE_SCOPES = Object.freeze(['MERCHANT_PROFILE_READ','ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE']);
const encoder = new TextEncoder();
const BASES = { sandbox: 'https://connect.squareupsandbox.com', production: 'https://connect.squareup.com' };
const ADDRESS_FIELDS = ['address_line_1', 'address_line_2', 'address_line_3', 'locality', 'sublocality', 'administrative_district_level_1', 'administrative_district_level_2', 'postal_code', 'country'];

function failure(code = 'square_unavailable') {
  const error = new Error(code === 'configuration_unavailable' ? 'Square configuration is unavailable.' : code === 'square_reconnect_required' ? 'Square authorization must be renewed.' : 'Square is temporarily unavailable.');
  error.code = code;
  error.status = code === 'square_reconnect_required' ? 401 : 503;
  return error;
}

function required(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) throw failure('configuration_unavailable');
  return value;
}

function httpsUrl(value, originOnly = false) {
  let url;
  try { url = new URL(required(value)); } catch { throw failure('configuration_unavailable'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || (originOnly && url.pathname !== '/')) throw failure('configuration_unavailable');
  return url;
}

function config(env) {
  if (!Object.hasOwn(BASES, env.SQUARE_ENVIRONMENT)) throw failure('configuration_unavailable');
  const base = BASES[env.SQUARE_ENVIRONMENT];
  const origin = httpsUrl(env.APP_ORIGIN, true).origin;
  const client_id = required(env.SQUARE_APP_ID);
  const client_secret = required(env.SQUARE_APP_SECRET);
  const version = required(env.SQUARE_API_VERSION);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) throw failure('configuration_unavailable');
  return { base, client_id, client_secret, version, redirect_uri: `${origin}/api/account/square/callback` };
}

export function authorizationUrl(env, state) {
  const options = config(env);
  if (typeof state !== 'string' || !state) throw failure();
  const url = new URL(`${options.base}/oauth2/authorize`);
  url.search = new URLSearchParams({ client_id: options.client_id, scope: SQUARE_SCOPES.join(' '), session: 'false', state, redirect_uri: options.redirect_uri });
  return url.toString();
}

async function request(options, path, body, authorization, fetcher) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const headers = { 'Square-Version': options.version, 'Content-Type': 'application/json' };
    if (authorization) headers.Authorization = authorization;
    const response = await fetcher(`${options.base}${path}`, { method: body ? 'POST' : 'GET', headers, ...(body ? {body: JSON.stringify(body)} : {}), signal: controller.signal, redirect: 'manual' });
    const data = await response.json();
    if (!response.ok || (Array.isArray(data?.errors) && data.errors.length)) {
      const authCodes = new Set(['INVALID_GRANT', 'UNAUTHORIZED', 'ACCESS_TOKEN_EXPIRED', 'ACCESS_TOKEN_REVOKED', 'invalid_grant']);
      const reconnect = response.status === 401 || (Array.isArray(data?.errors) && data.errors.some(error => authCodes.has(error.code))) || authCodes.has(data?.error);
      if (response.status === 403 && data.errors?.some(error => error.code === 'INSUFFICIENT_SCOPES' || error.code === 'FORBIDDEN')) throw Object.assign(new Error('Square permissions are required.'), { code: 'permissions_required', status: 409 });
      throw failure(reconnect ? 'square_reconnect_required' : 'square_unavailable');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure();
    return data;
  } catch (error) {
    if (error?.code === 'permissions_required' || error?.code === 'connection_busy') throw error;
    if (error?.code === 'square_reconnect_required') throw failure(error.code);
    throw failure();
  } finally { clearTimeout(timer); }
}

function normalizedTokens(data) {
  if (![data.merchant_id, data.access_token, data.refresh_token, data.expires_at].every(value => typeof value === 'string' && value.length > 0) || !Number.isFinite(Date.parse(data.expires_at))) throw failure();
  return { merchant_id: data.merchant_id, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
}

export async function exchangeCode(env, code, fetcher = fetch) {
  const options = config(env);
  if (typeof code !== 'string' || !code) throw failure();
  return normalizedTokens(await request(options, '/oauth2/token', {client_id: options.client_id, client_secret: options.client_secret, grant_type: 'authorization_code', code, redirect_uri: options.redirect_uri}, null, fetcher));
}

export async function refreshTokens(env, refresh_token, fetcher = fetch) {
  const options = config(env);
  if (typeof refresh_token !== 'string' || !refresh_token) throw failure('square_reconnect_required');
  return normalizedTokens(await request(options, '/oauth2/token', {client_id: options.client_id, client_secret: options.client_secret, grant_type: 'refresh_token', refresh_token}, null, fetcher));
}

export async function listLocations(env, access_token, fetcher = fetch) {
  const options = config(env);
  if (typeof access_token !== 'string' || !access_token) throw failure('square_reconnect_required');
  const data = await request(options, '/v2/locations', null, `Bearer ${access_token}`, fetcher);
  if (data.locations === undefined) return [];
  if (!Array.isArray(data.locations) || data.locations.some(location => !location || typeof location.id !== 'string' || !location.id || !['ACTIVE','INACTIVE'].includes(location.status))) throw failure();
  return data.locations.map(location => ({id: location.id, name: typeof location.name === 'string' ? location.name : '', address: Object.fromEntries(ADDRESS_FIELDS.filter(key => typeof location.address?.[key] === 'string').map(key => [key, location.address[key]])), status: location.status}));
}

export async function revokeToken(env, access_token, fetcher = fetch) {
  const options = config(env);
  if (typeof access_token !== 'string' || !access_token) throw failure('square_reconnect_required');
  const data = await request(options, '/oauth2/revoke', {client_id: options.client_id, access_token}, `Client ${options.client_secret}`, fetcher);
  if (data.success !== true) throw failure();
}

export async function verifyWebhook(env, rawBody, signature) {
  const key = required(env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  httpsUrl(env.SQUARE_WEBHOOK_URL);
  if (typeof rawBody !== 'string' || typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']);
  const bytes = Uint8Array.from(atob(signature), char => char.charCodeAt(0));
  return crypto.subtle.verify('HMAC', cryptoKey, bytes, encoder.encode(env.SQUARE_WEBHOOK_URL + rawBody));
}

export async function squareRequest(env, path, body, accessToken, fetcher = fetch) {
  if (typeof accessToken !== 'string' || !accessToken) throw failure('square_reconnect_required');
  const options = config(env);
  const target = new URL(options.base + path);
  if (!path.startsWith('/') || target.origin !== options.base || target.hash || target.username || target.password) throw failure();
  return request(options, path, body, `Bearer ${accessToken}`, fetcher);
}

export async function retrieveTokenStatus(env, accessToken, merchantId, fetcher = fetch) {
  const data = await squareRequest(env, '/oauth2/token/status', {}, accessToken, fetcher);
  if (data.client_id !== env.SQUARE_APP_ID || data.merchant_id !== merchantId || !Array.isArray(data.scopes) || data.scopes.length > 100 || data.scopes.some(scope => typeof scope !== 'string' || !/^[A-Z_]{1,100}$/.test(scope))) throw failure();
  const scopes = SQUARE_SCOPES.filter(scope => data.scopes.includes(scope));
  const has = (...required) => required.every(scope => scopes.includes(scope));
  return { scopes, missing: SQUARE_SCOPES.filter(scope => !scopes.includes(scope)), capabilities: { menu: has('ITEMS_READ'), orders: has('ORDERS_READ','ORDERS_WRITE'), payments: has('PAYMENTS_READ','PAYMENTS_WRITE'), checkout: has('ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_WRITE') } };
}

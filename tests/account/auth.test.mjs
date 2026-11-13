import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAccount } from '../../server/account/router.mjs';
import { randomToken, hashToken } from '../../server/account/security.mjs';
import { createD1 } from './d1-helper.mjs';
import { Store } from '../../server/account/store.mjs';

const now = 1800000000000;
function fixture() {
  const env = { ACCOUNT_DB: createD1(), APP_ORIGIN: 'https://serviio.example.test',
    TOKEN_ENCRYPTION_KEY: randomToken(), EMAIL_ACCOUNT_ID: 'a'.repeat(32), EMAIL_API_TOKEN: 'synthetic-email-secret', EMAIL_FROM: 'accounts@example.test',
    SQUARE_ENVIRONMENT: 'sandbox', SQUARE_APP_ID: 'sandbox-app', SQUARE_APP_SECRET: 'synthetic-square-secret', SQUARE_API_VERSION: '2026-10-21' };
  const sent = [];
  const fetcher = async (url, options) => {
    assert.match(url, /^https:\/\/api.cloudflare.com\/client\/v4\/accounts\//);
    const email = JSON.parse(options.body); sent.push(email);
    return Response.json({ success: true, result: { queued: [email.to], delivered: [], permanent_bounces: [] } });
  };
  const request = (path, body, cookie, origin = env.APP_ORIGIN) => handleAccount(new Request(`${env.APP_ORIGIN}/api/account/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env, { now, fetcher });
  return { env, sent, request };
}
async function login(f, email = 'Owner@example.test') {
  assert.equal((await f.request('sign-in', { email, locale: 'en' })).status, 200);
  const url = new URL(f.sent.at(-1).text.match(/https:\/\/\S+/)[0]);
  const token = new URLSearchParams(url.hash.slice(1)).get('token');
  const verified = await f.request('verify', { token });
  return { token, verified, cookie: verified.headers.get('Set-Cookie')?.split(';')[0] };
}
test('email link confirmation creates a private session and cannot be replayed', async () => {
  const f = fixture(); const { token, verified, cookie } = await login(f);
  assert.equal(verified.status, 200);
  assert.match(verified.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Lax/);
  assert.equal((await f.request('verify', { token })).status, 400);
  const me = await f.request('me', undefined, cookie);
  assert.equal(me.headers.get('Cache-Control'), 'no-store');
  assert.equal((await me.json()).account.email, 'owner@example.test');
  assert.equal((await f.request('me')).status, 401);
  await f.request('logout', {}, cookie);
  assert.equal((await f.request('me', undefined, cookie)).status, 401);
});
test('existing and new addresses get identical replies; raw challenges never persist', async () => {
  const f = fixture();
  const first = await f.request('sign-in', { email: 'owner@example.test' });
  const a = await first.json();
  await login(f);
  const second = await f.request('sign-in', { email: 'owner@example.test' });
  assert.deepEqual(await second.json(), a);
  const stored = f.env.ACCOUNT_DB.sql.prepare('SELECT token_hash FROM signin_challenges').all();
  const message = f.sent.at(-1).text;
  for (const row of stored) assert.ok(!message.includes(row.token_hash));
  assert.equal(f.env.ACCOUNT_DB.sql.prepare('SELECT COUNT(*) AS n FROM accounts').get().n, 1);
});
test('GET cannot redeem a challenge and wrong-origin mutations fail before email', async () => {
  const f = fixture();
  assert.equal((await f.request('verify')).status, 405);
  assert.equal((await f.request('sign-in', { email: 'owner@example.test' }, null, 'https://attacker.test')).status, 403);
  assert.equal(f.sent.length, 0);
});
test('missing delivery configuration and provider rejection fail honestly', async () => {
  const f = fixture(); delete f.env.EMAIL_API_TOKEN;
  assert.equal((await f.request('sign-in', { email: 'owner@example.test' })).status, 503);
  assert.equal(f.sent.length, 0);
  assert.equal((await f.request('sign-in', { email: 'a\r\nBcc:evil@example.test' })).status, 400);
});
test('address limits stop repeated email sends', async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) assert.equal((await f.request('sign-in', { email: 'owner@example.test' })).status, 200);
  assert.equal((await f.request('sign-in', { email: 'owner@example.test' })).status, 429);
  assert.equal(f.sent.length, 5);
});
test('restaurant changes are limited to the authenticated account', async () => {
  const f = fixture(); const a = await login(f); const b = await login(f, 'other@example.test');
  const body = { name: 'Restaurant A', contact_name: 'Owner A', phone: '+1 408 555 0100', account_id: 'other' };
  assert.equal((await f.request('restaurant', body, a.cookie)).status, 200);
  assert.equal((await (await f.request('me', undefined, b.cookie)).json()).restaurant, null);
  assert.equal((await f.request('restaurant', { ...body, name: ' ' }, a.cookie)).status, 400);
});
test('an expired challenge never creates a session', async () => {
  const f = fixture(); const token = randomToken();
  await new Store(f.env.ACCOUNT_DB).createChallenge(await hashToken(token), 'expired@example.test', 'en', now - 1, now - 1000);
  assert.equal((await f.request('verify', { token })).status, 400);
});
export { fixture, login, now };

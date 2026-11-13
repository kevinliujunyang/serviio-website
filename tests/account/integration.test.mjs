import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1 } from './d1-helper.mjs';
import { Store } from '../../server/account/store.mjs';
import { randomToken, hashToken, decrypt } from '../../server/account/security.mjs';
import { handleAccount } from '../../server/account/router.mjs';

const now = 1800000000000;
async function fixture(email = 'owner@example.test', shared) {
  const env = shared || { ACCOUNT_DB: createD1(), APP_ORIGIN: 'https://serviio.example.test', TOKEN_ENCRYPTION_KEY: randomToken(), SQUARE_ENVIRONMENT: 'sandbox', SQUARE_APP_ID: 'sandbox-app', SQUARE_APP_SECRET: 'private-app-secret', SQUARE_API_VERSION: '2026-10-21', SQUARE_WEBHOOK_SIGNATURE_KEY: 'test-webhook-key', SQUARE_WEBHOOK_URL: 'https://serviio.example.test/api/account/square/webhook' };
  const store = new Store(env.ACCOUNT_DB); const rawSession = randomToken();
  const account = await store.createSession(email, await hashToken(rawSession), now + 7 * 86400000, now);
  await store.saveRestaurant(account.id, 'Example Restaurant', 'Owner', '+1 408 555 0100', now);
  const calls = []; let mode = 'healthy'; let scopes = ['MERCHANT_PROFILE_READ']; let merchant = 'merchant-1'; let tokenGate; let revokeGate; let catalogGate; let checkoutGate; let checkoutStarted;
  const tokens = () => ({ merchant_id: merchant, access_token: 'private-access', refresh_token: 'private-refresh', expires_at: new Date(now + 30 * 86400000).toISOString() });
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/v2/catalog/list?')) { if (catalogGate) await catalogGate; return Response.json({objects:[{id:'ITEM1',type:'ITEM',item_data:{name:'Noodles',variations:[{id:'VAR1',type:'ITEM_VARIATION',item_variation_data:{item_id:'ITEM1',name:'Regular',pricing_type:'FIXED_PRICING',price_money:{amount:1250,currency:'USD'}}}]}}]}); }
    if (url.endsWith('/v2/orders/calculate')) return Response.json({order:{location_id:'location-1',total_money:{amount:1250,currency:'USD'}}});
    if (url.endsWith('/v2/online-checkout/payment-links')) { checkoutStarted?.(); if (checkoutGate) await checkoutGate; return Response.json({payment_link:{id:'LINK1',order_id:'ORDER1',url:'https://square.link/u/test'}}); }
    if (url.includes('/v2/orders/')) return Response.json({order:{id:'ORDER1',location_id:mode==='foreign-location'?'other-location':'location-1'}});
    if (url.includes('/v2/payments/')) return Response.json({payment:{id:'PAY1',location_id:mode==='foreign-location'?'other-location':'location-1',status:'COMPLETED'}});
    if (url.endsWith('/oauth2/token/status')) return Response.json({client_id:env.SQUARE_APP_ID,merchant_id:merchant,scopes});
    if (url.endsWith('/oauth2/token')) { if (tokenGate) await tokenGate; return Response.json(tokens()); }
    if (url.endsWith('/oauth2/revoke')) { if (revokeGate) await revokeGate; return Response.json(mode === 'revoke-failed' ? { success: false } : { success: true }); }
    if (mode === 'revoked') return Response.json({ errors: [{ code: 'ACCESS_TOKEN_REVOKED', detail: 'secret-provider-detail' }] }, { status: 401 });
    if (mode === 'failed') return Response.json({ errors: [{ code: 'INTERNAL_SERVER_ERROR', detail: 'secret-provider-detail' }] }, { status: 500 });
    return Response.json({ locations: [{ id: 'location-1', name: 'Main', status: 'ACTIVE' }, { id: 'closed', name: 'Closed', status: 'INACTIVE' }] });
  };
  const request = (path, body, cookie = `serviio_session=${rawSession}`) => handleAccount(new Request(`${env.APP_ORIGIN}/api/account/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { Origin: env.APP_ORIGIN, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env, { now, fetcher });
  async function connect() {
    const started = await request('square/connect', {}); assert.equal(started.status, 200);
    const authorize = new URL((await started.json()).url);
    const state = authorize.searchParams.get('state');
    const result = await request(`square/callback?state=${state}&code=synthetic-code`);
    return { state, result, authorize };
  }
  return { env, account, store, calls, request, connect, setMode(value) { mode = value; }, setScopes(value) { scopes = value; }, setMerchant(value) { merchant = value; }, setGates(token, revoke) { tokenGate = token; revokeGate = revoke; }, setCatalogGate(value) { catalogGate=value; }, setCheckoutGate(value,onStart) { checkoutGate=value;checkoutStarted=onStart; } };
}
test('complete OAuth, active location selection and confirmed revocation work without leaking tokens', async () => {
  const f = await fixture(); const { authorize, result, state } = await f.connect();
  assert.equal(authorize.searchParams.get('scope'), 'MERCHANT_PROFILE_READ ITEMS_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE');
  assert.equal(authorize.searchParams.get('session'), 'false');
  assert.match(result.headers.get('Location'), /square=connected$/);
  const stored = await f.store.connection(f.account.id);
  assert.ok(!stored.token_cipher.includes('private-access'));
  assert.equal(JSON.parse(await decrypt(stored.token_cipher, f.env.TOKEN_ENCRYPTION_KEY)).access_token, 'private-access');
  assert.match((await f.request(`square/callback?state=${state}&code=retry`)).headers.get('Location'), /square=error$/);
  assert.equal(f.calls.filter(call => call.url.endsWith('/oauth2/token')).length, 1);
  assert.equal((await f.request('square/location', { location_id: 'foreign' })).status, 400);
  assert.equal((await f.request('square/location', { location_id: 'closed' })).status, 400);
  assert.equal((await f.request('square/location', { location_id: 'location-1' })).status, 200);
  const me = await (await f.request('me')).json();
  assert.equal(me.connection.location_id, 'location-1');
  assert.equal(me.connection.verified_at, now);
  assert.ok(!JSON.stringify(me).includes('private-'));
  assert.equal((await f.request('square/disconnect', {})).status, 200);
  assert.equal((await f.store.connection(f.account.id)).token_cipher, null);
  assert.equal((await f.store.connection(f.account.id)).status, 'disconnected');
});
test('wrong sessions, denied authorization and state mismatch never exchange a code', async () => {
  const f = await fixture();
  const start = await (await f.request('square/connect', {})).json(); const state = new URL(start.url).searchParams.get('state');
  assert.match((await f.request(`square/callback?state=${state}&code=wrong`, undefined, '')).headers.get('Location'), /square=error$/);
  assert.match((await f.request(`square/callback?state=${randomToken()}&code=wrong`)).headers.get('Location'), /square=error$/);
  assert.match((await f.request(`square/callback?state=${state}&error=access_denied`)).headers.get('Location'), /square=denied$/);
  assert.equal(f.calls.length, 0);
  assert.equal(await f.store.connection(f.account.id), null);
});
test('an existing merchant connection cannot move to another account', async () => {
  const first = await fixture(); await first.connect();
  const second = await fixture('other@example.test', first.env);
  assert.match((await second.connect()).result.headers.get('Location'), /square=error$/);
  assert.equal(await second.store.connection(second.account.id), null);
  assert.equal((await first.store.connection(first.account.id)).merchant_id, 'merchant-1');
  assert.equal(second.calls.some(call => call.url.endsWith('/oauth2/revoke')), false);
});
test('provider validation failure is visible and recovers on the next successful check', async () => {
  const f = await fixture(); await f.connect(); f.setMode('failed');
  const failed = await (await f.request('me')).json(); assert.equal(failed.connection.status, 'renewal_failed');
  f.setMode('healthy');
  const recovered = await (await f.request('me')).json(); assert.equal(recovered.connection.status, 'connected');
});
test('failed remote revocation retains usable retry state, confirmed retry clears it', async () => {
  const f = await fixture(); await f.connect(); f.setMode('revoke-failed');
  assert.equal((await f.request('square/disconnect', {})).status, 503);
  assert.ok((await f.store.connection(f.account.id)).token_cipher);
  f.setMode('healthy'); assert.equal((await f.request('square/disconnect', {})).status, 200);
  assert.equal((await f.store.connection(f.account.id)).token_cipher, null);
});
async function webhook(f, createdAt = now) {
  const raw = JSON.stringify({ type: 'oauth.authorization.revoked', merchant_id: 'merchant-1', created_at: new Date(createdAt).toISOString(), data: { object: { revocation: { revoked_at: new Date(createdAt).toISOString() } } } });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(f.env.SQUARE_WEBHOOK_SIGNATURE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(f.env.SQUARE_WEBHOOK_URL + raw)))));
  return handleAccount(new Request(f.env.SQUARE_WEBHOOK_URL, { method: 'POST', headers: { 'x-square-hmacsha256-signature': signature }, body: raw }), f.env, { now });
}
test('signed revocation clears secrets, invalid signature does not, and local disconnect releases ownership', async () => {
  const f = await fixture(); await f.connect();
  const invalid = await handleAccount(new Request(f.env.SQUARE_WEBHOOK_URL, { method: 'POST', body: '{}' }), f.env, { now });
  assert.equal(invalid.status, 403); assert.ok((await f.store.connection(f.account.id)).token_cipher);
  assert.equal((await webhook(f)).status, 200);
  assert.equal((await f.store.connection(f.account.id)).token_cipher, null);
  assert.equal((await f.request('square/disconnect', {})).status, 200);
  assert.equal((await f.store.connection(f.account.id)).merchant_id, null);
});
test('an older delayed revocation event cannot revoke a newer authorization', async () => {
  const f = await fixture(); await f.connect();
  assert.equal((await webhook(f, now - 60000)).status, 200);
  assert.ok((await f.store.connection(f.account.id)).token_cipher);
});
test('oversized bodies, unexpected methods and invalid config fail before outbound requests', async () => {
  const f = await fixture();
  assert.equal((await f.request('restaurant', { name: 'x'.repeat(17000) })).status, 413);
  assert.equal((await f.request('square/connect')).status, 405);
  delete f.env.TOKEN_ENCRYPTION_KEY;
  assert.equal((await f.request('square/connect', {})).status, 503);
  assert.equal(f.calls.length, 0);
});
test('an in-flight OAuth callback cannot undo a successful disconnect', async () => {
  const f = await fixture(); await f.connect();
  const start = await (await f.request('square/connect', {})).json();
  const state = new URL(start.url).searchParams.get('state');
  let releaseToken; let releaseRevoke;
  f.setGates(new Promise(resolve => { releaseToken = resolve; }), new Promise(resolve => { releaseRevoke = resolve; }));
  const callback = f.request(`square/callback?state=${state}&code=new-code`);
  while (f.calls.filter(c => c.url.endsWith('/oauth2/token')).length < 2) await new Promise(resolve => setImmediate(resolve));
  const disconnect = f.request('square/disconnect', {});
  while (!f.calls.some(c => c.url.endsWith('/oauth2/revoke'))) await new Promise(resolve => setImmediate(resolve));
  releaseToken();
  const callbackResult = await callback;
  releaseRevoke();
  const disconnectResult = await disconnect;
  assert.match(callbackResult.headers.get('Location'), /square=error$/);
  assert.equal(disconnectResult.status, 200);
  const final = await f.store.connection(f.account.id);
  assert.equal(final.status, 'disconnected'); assert.equal(final.token_cipher, null);
});
test('disconnect also invalidates an initial authorization whose token exchange is pending', async () => {
  const f = await fixture();
  const start = await (await f.request('square/connect', {})).json();
  const state = new URL(start.url).searchParams.get('state');
  let release;
  f.setGates(new Promise(resolve => { release = resolve; }));
  const callback = f.request(`square/callback?state=${state}&code=first-code`);
  while (!f.calls.length) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await f.request('square/disconnect', {})).status, 200);
  release(); assert.match((await callback).headers.get('Location'), /square=error$/);
  assert.equal((await f.store.connection(f.account.id)).token_cipher, null);
});
test('a signed revocation arriving during disconnect still converges to disconnected', async () => {
  const f = await fixture(); await f.connect();
  let release;
  f.setGates(null, new Promise(resolve => { release = resolve; }));
  const disconnect = f.request('square/disconnect', {});
  while (!f.calls.some(c => c.url.endsWith('/oauth2/revoke'))) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await webhook(f)).status, 200);
  release(); assert.equal((await disconnect).status, 200);
  const final = await f.store.connection(f.account.id);
  assert.equal(final.status, 'disconnected'); assert.equal(final.merchant_id, null);
});

test('account readiness reports missing Square setup without exposing credentials or calling Square',async()=>{
 const f=await fixture();
 assert.equal((await (await f.request('me')).json()).square_configured,true);
 delete f.env.TOKEN_ENCRYPTION_KEY;
 const response=await f.request('me');assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.square_configured,false);assert.equal(f.calls.length,0);
 assert.ok(!JSON.stringify(body).includes('private-app-secret'));
});

test('permission verification reports legacy grants honestly and isolates account access',async()=>{
 const f=await fixture();await f.connect();
 assert.equal((await f.request('square/permissions',undefined,'')).status,401);
 const old=await f.request('square/permissions');assert.equal(old.status,200);const limited=await old.json();
 assert.equal(limited.capabilities.menu,false);assert.ok(limited.missing.includes('ORDERS_WRITE'));
 f.setScopes(['MERCHANT_PROFILE_READ','ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE']);
 const expanded=await (await f.request('square/permissions')).json();assert.deepEqual(expanded.missing,[]);assert.equal(expanded.capabilities.checkout,true);
 assert.ok(!JSON.stringify(expanded).includes('private-access'));
});

const allCommerceScopes=['MERCHANT_PROFILE_READ','ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE'];
const checkoutInput={idempotency_key:'owner-intent-000001',line_items:[{catalog_object_id:'VAR1',quantity:1}],buyer:{name:'Test Buyer',phone:'+14085550100'}};
test('commerce APIs require a saved active location and actual granted permissions before provider mutation',async()=>{
 const f=await fixture();await f.connect();f.setScopes(allCommerceScopes);
 assert.equal((await f.request('square/menu')).status,400);
 await f.request('square/location',{location_id:'location-1'});
 f.setScopes(['MERCHANT_PROFILE_READ']);
 assert.equal((await f.request('square/menu')).status,409);
 assert.equal((await f.request('square/checkout',checkoutInput)).status,409);
 assert.equal(f.calls.some(call=>call.url.endsWith('/v2/online-checkout/payment-links')),false);
});
test('catalog, quote, checkout and readback stay bound to the authenticated saved location',async()=>{
 const f=await fixture();await f.connect();f.setScopes(allCommerceScopes);await f.request('square/location',{location_id:'location-1'});
 assert.equal((await f.request('square/menu')).status,200);
 assert.equal((await f.request('square/quote',checkoutInput)).status,200);
 assert.equal((await f.request('square/checkout',{...checkoutInput,location_id:'other'})).status,400);
 const response=await f.request('square/checkout',checkoutInput);assert.equal(response.status,200);assert.equal((await response.json()).url,'https://square.link/u/test');
 const sent=JSON.parse(f.calls.find(call=>call.url.endsWith('/v2/online-checkout/payment-links')).options.body);
 assert.equal(sent.order.location_id,'location-1');assert.equal(sent.idempotency_key,checkoutInput.idempotency_key);assert.equal(sent.order.line_items[0].base_price_money,undefined);
 assert.equal((await f.request('square/order?id=ORDER1')).status,200);assert.equal((await f.request('square/payment?id=PAY1')).status,200);
 f.setMode('foreign-location');assert.equal((await f.request('square/order?id=ORDER1')).status,400);assert.equal((await f.request('square/payment?id=PAY1')).status,400);
 assert.equal((await f.request('square/checkout',checkoutInput,'')).status,401);
});

test('checkout refuses to submit after logout during catalog validation',async()=>{
 const f=await fixture();await f.connect();f.setScopes(allCommerceScopes);await f.request('square/location',{location_id:'location-1'});
 let release;f.setCatalogGate(new Promise(resolve=>{release=resolve;}));
 const pending=f.request('square/checkout',checkoutInput);await new Promise(resolve=>setImmediate(resolve));
 await f.request('logout',{});release();
 assert.equal((await pending).status,409);assert.equal(f.calls.some(call=>call.url.endsWith('/v2/online-checkout/payment-links')),false);
});
test('in-flight checkout blocks disconnect and releases its lease after receipt',async()=>{
 const f=await fixture();await f.connect();f.setScopes(allCommerceScopes);await f.request('square/location',{location_id:'location-1'});
 let release,started;const start=new Promise(resolve=>{started=resolve;});f.setCheckoutGate(new Promise(resolve=>{release=resolve;}),started);
 const pending=f.request('square/checkout',checkoutInput);await start;
 try { assert.equal((await f.request('square/disconnect',{})).status,409);assert.equal((await f.request('square/location',{location_id:'location-1'})).status,409); } finally { release(); }
 assert.equal((await pending).status,200);assert.equal((await f.request('square/disconnect',{})).status,200);
});

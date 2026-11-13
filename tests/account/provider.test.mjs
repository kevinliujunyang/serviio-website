import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import * as square from '../../server/account/square.mjs';
import { authorizationUrl, exchangeCode, refreshTokens, listLocations, revokeToken, verifyWebhook } from '../../server/account/square.mjs';
const env = { APP_ORIGIN:'https://example.com', SQUARE_ENVIRONMENT:'sandbox', SQUARE_APP_ID:'app-id', SQUARE_APP_SECRET:'app-secret', SQUARE_API_VERSION:'2026-09-16', SQUARE_WEBHOOK_URL:'https://example.com/api/account/square/webhook', SQUARE_WEBHOOK_SIGNATURE_KEY:'webhook-key' };
const tokens = { merchant_id:'merchant', access_token:'access-secret', refresh_token:'refresh-secret', expires_at:'2026-12-12T12:00:00Z' };
const json = (body,status=200) => new Response(JSON.stringify(body), {status});
test('authorization has fixed origin, callback, state, minimal scope and fresh Square sign-in', () => {
 const url = new URL(authorizationUrl(env,'state-secret'));
 assert.equal(url.origin,'https://connect.squareupsandbox.com');
 assert.equal(url.pathname,'/oauth2/authorize');
 assert.equal(url.searchParams.get('session'),'false');
 assert.equal(url.searchParams.get('scope'),'MERCHANT_PROFILE_READ ITEMS_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE');
 assert.equal(url.searchParams.get('state'),'state-secret');
 assert.equal(url.searchParams.get('redirect_uri'),'https://example.com/api/account/square/callback');
 assert.equal(new URL(authorizationUrl({...env,SQUARE_ENVIRONMENT:'production'},'state')).origin,'https://connect.squareup.com');
});
test('invalid or missing configuration fails without provider traffic', async () => {
 for (const patch of [{SQUARE_ENVIRONMENT:'constructor'},{SQUARE_ENVIRONMENT:undefined},{SQUARE_APP_SECRET:''},{APP_ORIGIN:'http://example.com'},{APP_ORIGIN:'https://example.com/path'},{SQUARE_API_VERSION:''}]) {
  await assert.rejects(() => exchangeCode({...env,...patch},'code',()=>{throw new Error('must not fetch');}), {code:'configuration_unavailable'});
 }
});
test('code exchange and refresh use explicit server credentials and normalized response', async () => {
 let calls = [];
 const fetcher = async (url,options) => { calls.push({url,options,body:JSON.parse(options.body)}); return json({...tokens,extra:'private'}); };
 assert.deepEqual(await exchangeCode(env,'authorization-secret',fetcher),tokens);
 assert.deepEqual(await refreshTokens(env,'refresh-secret',fetcher),tokens);
 assert.equal(calls[0].url,'https://connect.squareupsandbox.com/oauth2/token');
 assert.equal(calls[0].body.grant_type,'authorization_code');
 assert.equal(calls[0].body.redirect_uri,'https://example.com/api/account/square/callback');
 assert.equal(calls[1].body.grant_type,'refresh_token');
 assert.equal(calls[1].body.refresh_token,'refresh-secret');
 assert.equal(calls[1].body.client_secret,'app-secret');
 assert.equal(calls[0].options.headers['Square-Version'],'2026-09-16');
 assert.ok(calls[0].options.signal instanceof AbortSignal);
});
test('locations expose only location display fields and retain inactive status for server validation', async () => {
 const result = await listLocations(env,'access-secret',async (url,options) => {
  assert.equal(url,'https://connect.squareupsandbox.com/v2/locations');
  assert.equal(options.headers.Authorization,'Bearer access-secret');
  return json({locations:[{id:'loc',name:'Restaurant',status:'ACTIVE',merchant_id:'secret',address:{address_line_1:'1 Main',country:'US',secret:'hidden'}},{id:'closed',status:'INACTIVE'}]});
 });
 assert.deepEqual(result,[{id:'loc',name:'Restaurant',status:'ACTIVE',address:{address_line_1:'1 Main',country:'US'}},{id:'closed',name:'',status:'INACTIVE',address:{}}]);
});
test('malformed success, network failure and provider errors are safe and stable', async () => {
 for (const fetcher of [async()=>json({}), async()=>{throw new Error('access-secret');},async()=>json({errors:[{detail:'access-secret'}]},500),async()=>new Response('not-json')]) {
  await assert.rejects(()=>exchangeCode(env,'code',fetcher),error=>error.code==='square_unavailable' && !error.message.includes('access-secret'));
 }
 await assert.rejects(()=>refreshTokens(env,'refresh-secret',async()=>json({errors:[{code:'INVALID_GRANT',detail:'refresh-secret'}]},400)),{code:'square_reconnect_required'});
});
test('revocation requires Client authentication and confirmed success', async () => {
 await revokeToken(env,'access-secret',async (url,options) => {
  assert.equal(url,'https://connect.squareupsandbox.com/oauth2/revoke');
  assert.equal(options.headers.Authorization,'Client app-secret');
  assert.deepEqual(JSON.parse(options.body),{client_id:'app-id',access_token:'access-secret'});
  return json({success:true});
 });
 for (const body of [{success:false},{}]) await assert.rejects(()=>revokeToken(env,'access-secret',async()=>json(body)),{code:'square_unavailable'});
});
test('webhook verification signs exact configured URL and unmodified body', async () => {
 const body = '{ "merchant_id": "merchant" }';
 const signature = createHmac('sha256',env.SQUARE_WEBHOOK_SIGNATURE_KEY).update(env.SQUARE_WEBHOOK_URL+body).digest('base64');
 assert.equal(await verifyWebhook(env,body,signature),true);
 assert.equal(await verifyWebhook(env,JSON.stringify(JSON.parse(body)),signature),false);
 assert.equal(await verifyWebhook({...env,SQUARE_WEBHOOK_URL:env.SQUARE_WEBHOOK_URL+'/'},body,signature),false);
 assert.equal(await verifyWebhook(env,body,'bad'),false);
 assert.equal(await verifyWebhook(env,body,null),false);
 await assert.rejects(()=>verifyWebhook({...env,SQUARE_WEBHOOK_SIGNATURE_KEY:''},body,signature),{code:'configuration_unavailable'});
});

test('token introspection verifies the actual grant and merchant/app identity',async()=>{
 const status=await square.retrieveTokenStatus(env,'private-token','merchant-123',async(url,options)=>{
  assert.equal(url,'https://connect.squareupsandbox.com/oauth2/token/status');assert.equal(options.method,'POST');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer private-token');
  return json({client_id:'app-id',merchant_id:'merchant-123',scopes:['MERCHANT_PROFILE_READ']});
 });
 assert.equal(status.capabilities.menu,false);assert.equal(status.capabilities.checkout,false);assert.ok(status.missing.includes('ITEMS_READ'));
 assert.ok(!JSON.stringify(status).includes('private-token'));
 const granted=await square.retrieveTokenStatus(env,'token','merchant-123',async()=>json({client_id:'app-id',merchant_id:'merchant-123',scopes:['MERCHANT_PROFILE_READ','ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE']}));
 assert.deepEqual(granted.missing,[]);assert.equal(granted.capabilities.checkout,true);
});
test('introspection rejects another application, merchant and malformed scopes',async()=>{
 for(const patch of [{client_id:'another-app'},{merchant_id:'other-merchant'},{scopes:'ITEMS_READ'},{scopes:[null]}]){
  await assert.rejects(()=>square.retrieveTokenStatus(env,'token','merchant-123',async()=>json({client_id:'app-id',merchant_id:'merchant-123',scopes:[],...patch})),{code:'square_unavailable'});
 }
});

test('catalog-backed checkout readiness requires menu permission too',async()=>{
 const result=await square.retrieveTokenStatus(env,'token','merchant-123',async()=>json({client_id:'app-id',merchant_id:'merchant-123',scopes:['MERCHANT_PROFILE_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE']}));
 assert.equal(result.capabilities.checkout,false);
});

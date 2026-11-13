import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('Cloudflare runtime sends email and rejects redirects without forwarding credentials', async () => {
  const bundle = await build({ stdin: { contents: `import { sendSignIn } from './server/account/email.mjs';
    export default { async fetch(request, env) {
      try { await sendSignIn(env, 'owner@example.test', 'https://example.test/account/#token=private', 'en'); return new Response('accepted'); }
      catch (error) { return Response.json({ error: error.code }, { status: 503 }); }
    }};`, resolveDir: process.cwd(), sourcefile: 'email-runtime-worker.mjs' }, bundle: true, write: false, format: 'esm', platform: 'browser' });
  let responseStatus = 201;
  const requests = [];
  const worker = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-01-20', bindings: { EMAIL_PROVIDER: 'resend', EMAIL_FROM: 'signin@example.test', RESEND_API_KEY: 're_test-only' }, outboundService: async request => {
    requests.push({ url: request.url, authorization: request.headers.get('Authorization') });
    return responseStatus === 201 ? Response.json({ id: 'test-email' }, { status: 201 }) : new Response(null, { status: 302, headers: { Location: 'https://untrusted.example.test/' } });
  }}));
  try {
    assert.equal((await worker.dispatchFetch('https://example.test/')).status, 200);
    responseStatus = 302;
    assert.equal((await worker.dispatchFetch('https://example.test/')).status, 503);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.url === 'https://api.resend.com/emails' && request.authorization === 'Bearer re_test-only'));
  } finally { await worker.dispose(); }
});

test('Square code exchange also works in Cloudflare runtime without following redirects', async () => {
  const bundle = await build({ stdin: { contents: `import { exchangeCode } from './server/account/square.mjs';
    export default { async fetch(request, env) {
      try { await exchangeCode(env, 'test-code'); return new Response('accepted'); }
      catch (error) { return Response.json({ error: error.code }, { status: 503 }); }
    }};`, resolveDir: process.cwd(), sourcefile: 'square-runtime-worker.mjs' }, bundle: true, write: false, format: 'esm', platform: 'browser' });
  let redirect = false; const urls = [];
  const worker = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-01-20', bindings: { APP_ORIGIN: 'https://example.test', SQUARE_ENVIRONMENT: 'sandbox', SQUARE_APP_ID: 'test-app', SQUARE_APP_SECRET: 'test-secret', SQUARE_API_VERSION: '2026-09-16' }, outboundService: async request => {
    urls.push(request.url);
    return redirect ? new Response(null, { status: 302, headers: { Location: 'https://untrusted.example.test/' } }) : Response.json({ merchant_id: 'test-merchant', access_token: 'test-token', refresh_token: 'test-refresh', expires_at: '2026-12-12T12:00:00Z' });
  }}));
  try {
    assert.equal((await worker.dispatchFetch('https://example.test/')).status, 200);
    redirect = true;
    assert.equal((await worker.dispatchFetch('https://example.test/')).status, 503);
    assert.deepEqual(urls, ['https://connect.squareupsandbox.com/oauth2/token', 'https://connect.squareupsandbox.com/oauth2/token']);
  } finally { await worker.dispose(); }
});

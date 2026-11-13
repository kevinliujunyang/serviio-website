import test from 'node:test';
import assert from 'node:assert/strict';
import { emailConfigured, sendSignIn } from '../../server/account/email.mjs';
const env = { EMAIL_ACCOUNT_ID: 'a'.repeat(32), EMAIL_API_TOKEN: 'private', EMAIL_FROM: 'accounts@example.test' };
test('bounced, malformed and denied email responses do not report delivery success', async () => {
  for (const body of [{ success: false }, { success: true, result: { permanent_bounces: ['owner@example.test'], delivered: [], queued: [] } }, {}]) {
    await assert.rejects(() => sendSignIn(env, 'owner@example.test', 'https://example.test/account/#token=secret', 'en', async () => Response.json(body)));
  }
});
test('transactional Chinese message uses canonical fragment link and bearer secret only server-side', async () => {
  await sendSignIn(env, 'owner@example.test', 'https://example.test/zh/account/#token=secret', 'zh', async (url, options) => {
    assert.match(url, /email\/sending\/send$/);
    assert.equal(options.headers.Authorization, 'Bearer private');
    const body = JSON.parse(options.body);
    assert.match(body.text, /https:\/\/example.test\/zh\/account\/#token=secret/);
    assert.match(body.subject, /Serviio/);
    assert.ok(!body.text.includes('private'));
    return Response.json({ success: true, result: { queued: ['owner@example.test'] } });
  });
});

const resendEnv = { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_private-test-secret', EMAIL_FROM: 'accounts@example.test' };
const recipient = 'owner@example.test';
const signInLink = 'https://example.test/account/#token=challenge-secret';
test('email configuration selects the provider explicitly and keeps the Cloudflare default', () => {
  assert.equal(emailConfigured(env), true);
  assert.equal(emailConfigured({ ...env, EMAIL_PROVIDER: 'cloudflare' }), true);
  assert.equal(emailConfigured(resendEnv), true);
  for (const patch of [{ EMAIL_PROVIDER: 'other' }, { EMAIL_PROVIDER: '' }, { EMAIL_PROVIDER: null }, { RESEND_API_KEY: '' }, { RESEND_API_KEY: '  ' }, { RESEND_API_KEY: undefined }, { EMAIL_FROM: 'Name <accounts@example.test>' }, { EMAIL_FROM: 'accounts@example.test,other@example.test' }]) {
    assert.equal(emailConfigured({ ...resendEnv, ...patch }), false);
  }
  assert.equal(emailConfigured({ ...resendEnv, EMAIL_PROVIDER: undefined }), false);
  assert.equal(emailConfigured({ ...env, EMAIL_PROVIDER: 'resend' }), false);
});
test('unconfigured and unknown email providers fail before making a request', async () => {
  for (const configuration of [{ ...resendEnv, RESEND_API_KEY: '' }, { ...env, EMAIL_PROVIDER: 'other' }, { ...resendEnv, EMAIL_FROM: 'bad' }]) {
    let requests = 0;
    await assert.rejects(() => sendSignIn(configuration, recipient, signInLink, 'en', async () => { requests++; }), { code: 'configuration_unavailable' });
    assert.equal(requests, 0);
  }
});
test('Resend sends the English template to the fixed API with server-only authentication', async () => {
  let payload;
  const result = await sendSignIn(resendEnv, recipient, signInLink, 'en', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, `Bearer ${resendEnv.RESEND_API_KEY}`);
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.headers['User-Agent'], 'Serviio-Accounts/1.0');
    payload = JSON.parse(options.body);
    assert.deepEqual(Object.keys(payload).sort(), ['from', 'subject', 'text', 'to']);
    assert.equal(payload.from, resendEnv.EMAIL_FROM);
    assert.equal(payload.to, recipient);
    assert.equal(payload.subject, 'Sign in to Serviio');
    assert.match(payload.text, /15 minutes/);
    assert.ok(payload.text.includes(signInLink));
    assert.ok(!options.body.includes(resendEnv.RESEND_API_KEY));
    return Response.json({ id: 'accepted-email-id' }, { status: 201 });
  });
  assert.equal(result, undefined);
});
test('Resend and Cloudflare share the same localized Chinese sign-in message', async () => {
  const messages = [];
  for (const configuration of [{ ...env, EMAIL_PROVIDER: 'cloudflare' }, resendEnv]) {
    await sendSignIn(configuration, recipient, signInLink, 'zh', async (url, options) => {
      messages.push(JSON.parse(options.body));
      return Response.json(configuration.EMAIL_PROVIDER === 'resend' ? { id: 'accepted-email-id' } : { success: true, result: { delivered: [recipient] } });
    });
  }
  assert.deepEqual(messages[0], messages[1]);
  assert.equal(messages[0].subject, '登录 Serviio');
});
test('Resend requires a nonempty string ID and a successful HTTP response', async () => {
  for (const body of [{}, { id: '' }, { id: '   ' }, { id: 123 }, null, [], { success: true, result: { queued: [recipient] } }]) {
    await assert.rejects(() => sendSignIn(resendEnv, recipient, signInLink, 'en', async () => Response.json(body)), { code: 'email_unavailable', status: 503 });
  }
  await assert.rejects(() => sendSignIn(resendEnv, recipient, signInLink, 'en', async () => new Response('not JSON')), { code: 'email_unavailable' });
});
test('Resend denied, rate-limited, redirected and aborted requests return safe errors', async () => {
  for (const fetcher of [
    ...[401, 429, 500, 302].map(status => async () => Response.json({ id: 'id', message: resendEnv.RESEND_API_KEY + signInLink }, { status })),
    async () => { throw new Error(resendEnv.RESEND_API_KEY + signInLink); },
    async () => { throw new DOMException('Timed out', 'TimeoutError'); }
  ]) {
    await assert.rejects(() => sendSignIn(resendEnv, recipient, signInLink, 'en', fetcher), error => {
      assert.equal(error.code, 'email_unavailable');
      assert.equal(error.status, 503);
      assert.equal(error.message, 'email_unavailable');
      assert.ok(!JSON.stringify(error).includes(resendEnv.RESEND_API_KEY));
      assert.ok(!JSON.stringify(error).includes('challenge-secret'));
      return true;
    });
  }
});

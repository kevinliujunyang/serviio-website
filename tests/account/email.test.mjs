import test from 'node:test';
import assert from 'node:assert/strict';
import { sendSignIn } from '../../server/account/email.mjs';
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

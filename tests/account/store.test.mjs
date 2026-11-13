import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1 } from './d1-helper.mjs';
import { Store } from '../../server/account/store.mjs';

const now = 1800000000000;
async function owner(store, email = 'owner@example.test') {
  return store.createSession(email, `session-${email}`, now + 10000, now);
}
test('only one concurrent challenge redemption succeeds; expired tokens fail', async () => {
  const store = new Store(createD1());
  await store.createChallenge('hash', 'owner@example.test', 'en', now + 1000, now);
  const result = await Promise.all([store.consumeChallenge('hash', now), store.consumeChallenge('hash', now)]);
  assert.equal(result.filter(Boolean).length, 1);
  await store.createChallenge('old', 'owner@example.test', 'en', now - 1, now - 100);
  assert.equal(await store.consumeChallenge('old', now), null);
});
test('session expiry and OAuth state are bound to the owner and session', async () => {
  const store = new Store(createD1());
  const account = await owner(store);
  assert.equal((await store.session('session-owner@example.test', now)).email, account.email);
  assert.equal(await store.session('session-owner@example.test', now + 10001), null);
  await store.createOAuth('state', account.id, 'session-owner@example.test', 'en', now + 1000, now);
  assert.equal(await store.consumeOAuth('state', account.id, 'different', now), null);
  assert.ok(await store.consumeOAuth('state', account.id, 'session-owner@example.test', now));
  assert.equal(await store.consumeOAuth('state', account.id, 'session-owner@example.test', now), null);
});
test('a merchant cannot be silently reassigned, and renewal cannot resurrect disconnect', async () => {
  const store = new Store(createD1());
  const a = await owner(store); const b = await owner(store, 'other@example.test');
  await store.saveConnection(a.id, 'merchant', 'cipher', now + 10000, now);
  await assert.rejects(() => store.saveConnection(b.id, 'merchant', 'other', now + 10000, now));
  assert.ok(await store.claimConnection(a.id, 'lease', now));
  assert.equal(await store.claimConnection(a.id, 'other', now), null);
  await store.revokeMerchant('merchant', now);
  assert.equal(await store.completeRenewal(a.id, 'lease', 'new', now + 20000, now), null);
  assert.equal((await store.connection(a.id)).token_cipher, null);
});
test('fixed-window request limits reject excess requests and recover next window', async () => {
  const store = new Store(createD1());
  assert.equal(await store.rateLimit('key', 1, 1000, now), true);
  assert.equal(await store.rateLimit('key', 1, 1000, now), false);
  assert.equal(await store.rateLimit('key', 1, 1000, now + 1000), true);
});

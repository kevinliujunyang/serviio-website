import test from 'node:test';
import assert from 'node:assert/strict';
import { randomToken, hashToken, encrypt, decrypt, parseCookie } from '../../server/account/security.mjs';

test('challenges use 32 unpredictable bytes and hashes never store the challenge', async () => {
  const token = randomToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, randomToken());
  assert.notEqual(await hashToken(token), token);
  assert.equal(await hashToken(token), await hashToken(token));
});
test('AES credentials reject another key and corrupted ciphertext', async () => {
  const key = randomToken();
  const value = await encrypt('private-merchant-tokens', key);
  assert.equal(await decrypt(value, key), 'private-merchant-tokens');
  assert.ok(!value.includes('private-merchant'));
  await assert.rejects(() => decrypt(value, randomToken()));
  await assert.rejects(() => decrypt(value.slice(0, -8), key));
  await assert.rejects(() => encrypt('secret', 'weak-key'));
});
test('unrelated or malformed cookies do not authenticate', () => {
  assert.equal(parseCookie('other=abc'), null);
  assert.equal(parseCookie('serviio_session=%ZZ'), null);
  assert.equal(parseCookie(`serviio_session=${randomToken()}`)?.length, 43);
});

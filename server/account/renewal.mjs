import { decrypt, encrypt, randomToken } from './security.mjs';
import { refreshTokens } from './square.mjs';

const DAY = 86400000;
const RENEWABLE = new Set(['connected', 'renewal_failed']);

function isDue(connection, now) {
  return connection && RENEWABLE.has(connection.status) && connection.token_cipher &&
    (now - connection.renewed_at >= 7 * DAY || connection.expires_at <= now + DAY);
}

export async function renewConnection(env, store, connection, now = Date.now(), fetcher = fetch) {
  if (!isDue(connection, now)) return null;
  const lease = randomToken();
  const claimed = await store.claimConnection(connection.account_id, lease, now);
  if (!claimed) return null;
  if (!isDue(claimed, now)) {
    await store.failRenewal(claimed.account_id, lease, claimed.status, now);
    return null;
  }
  let tokens;
  let tokenCipher;
  try {
    const current = JSON.parse(await decrypt(claimed.token_cipher, env.TOKEN_ENCRYPTION_KEY));
    tokens = await refreshTokens(env, current.refresh_token, fetcher);
    if (tokens.merchant_id !== claimed.merchant_id) {
      return store.failRenewal(claimed.account_id, lease, 'reconnect_required', now);
    }
    tokenCipher = await encrypt(JSON.stringify(tokens), env.TOKEN_ENCRYPTION_KEY);
  } catch (error) {
    return store.failRenewal(claimed.account_id, lease, error?.code === 'square_reconnect_required' ? 'reconnect_required' : 'renewal_failed', now);
  }
  return store.completeRenewal(claimed.account_id, lease, tokenCipher, Date.parse(tokens.expires_at), now);
}

export async function runRenewal(env, store, now = Date.now(), fetcher = fetch, clock = () => Date.now()) {
  await store.cleanup(now);
  const due = (await store.dueConnections(now, 100)).slice(0, 100);
  const result = { processed: due.length, renewed: 0, failed: 0, skipped: 0 };
  // Five outbound requests at a time keep a full batch within scheduled execution limits.
  for (let offset = 0; offset < due.length; offset += 5) {
    const updates = await Promise.all(due.slice(offset, offset + 5).map(connection => renewConnection(env, store, connection, clock(), fetcher)));
    for (const update of updates) {
      if (!update) result.skipped++;
      else if (update.status === 'connected') result.renewed++;
      else result.failed++;
    }
  }
  return result;
}

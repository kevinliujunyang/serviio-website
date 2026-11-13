import { randomToken } from './security.mjs';

export class Store {
  constructor(db) { this.db = db; }
  query(sql, ...args) { return this.db.prepare(sql).bind(...args); }
  createChallenge(hash, email, locale, expiresAt, now) {
    return this.query('INSERT INTO signin_challenges VALUES (?,?,?,?,?)', hash, email, locale, expiresAt, now).run();
  }
  consumeChallenge(hash, now) {
    return this.query('DELETE FROM signin_challenges WHERE token_hash=? AND expires_at>? RETURNING *', hash, now).first();
  }
  deleteChallenge(hash) { return this.query('DELETE FROM signin_challenges WHERE token_hash=?', hash).run(); }
  async createSession(email, hash, expiresAt, now) {
    await this.db.batch([
      this.query('INSERT INTO accounts(id,email,created_at) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING', randomToken(), email, now),
      this.query('INSERT INTO account_sessions(token_hash,account_id,expires_at,created_at) SELECT ?,id,?,? FROM accounts WHERE email=?', hash, expiresAt, now, email)
    ]);
    return this.session(hash, now);
  }
  session(hash, now) {
    return this.query('SELECT a.id,a.email,s.token_hash AS session_hash FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?', hash, now).first();
  }
  logout(hash) { return this.query('DELETE FROM account_sessions WHERE token_hash=?', hash).run(); }
  restaurant(accountId) { return this.query('SELECT name,contact_name,phone FROM restaurants WHERE account_id=?', accountId).first(); }
  saveRestaurant(id, name, contact, phone, now) {
    return this.query('INSERT INTO restaurants VALUES (?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET name=excluded.name,contact_name=excluded.contact_name,phone=excluded.phone,updated_at=excluded.updated_at', id, name, contact, phone, now).run();
  }
  createOAuth(hash, account, session, locale, expires, now) {
    return this.query('INSERT INTO oauth_attempts SELECT ?,?,?,?,?,?,COALESCE((SELECT version FROM square_connections WHERE account_id=?),0)', hash, account, session, locale, expires, now, account).run();
  }
  consumeOAuth(hash, account, session, now) {
    return this.query('DELETE FROM oauth_attempts WHERE state_hash=? AND account_id=? AND session_hash=? AND expires_at>? RETURNING *', hash, account, session, now).first();
  }
  connection(account) { return this.query('SELECT * FROM square_connections WHERE account_id=?', account).first(); }
  async saveConnection(account, merchant, cipher, expires, now, expectedVersion, sessionHash = null) {
    if (expectedVersion === undefined) expectedVersion = (await this.connection(account))?.version || 0;
    try {
      const result = await this.query(`INSERT INTO square_connections(account_id,merchant_id,token_cipher,expires_at,renewed_at,status,authorized_at)
        SELECT ?,?,?,?,?,'connected',? WHERE COALESCE((SELECT version FROM square_connections WHERE account_id=?),0)=?
        AND (? IS NULL OR EXISTS(SELECT 1 FROM account_sessions WHERE token_hash=? AND account_id=? AND expires_at>?))
        ON CONFLICT(account_id) DO UPDATE SET merchant_id=excluded.merchant_id,
        token_cipher=excluded.token_cipher,expires_at=excluded.expires_at,renewed_at=excluded.renewed_at,
        verified_at=NULL,location_id=CASE WHEN merchant_id=excluded.merchant_id THEN location_id ELSE NULL END,
        status='connected',lease=NULL,lease_until=0,version=version+1,authorized_at=excluded.authorized_at,last_attempt_at=0
        WHERE version=? AND status!='disconnecting' AND lease_until<=?`, account, merchant, cipher, expires, now, now, account, expectedVersion, sessionHash, sessionHash, account, now, expectedVersion, now).run();
      if (result.meta.changes !== 1) throw Object.assign(new Error('Connection changed'), { code: 'connection_busy', status: 409 });
      return this.connection(account);
    } catch (error) {
      if (/UNIQUE constraint failed.*merchant_id/i.test(error.message)) {
        const conflict = new Error('Merchant already connected'); conflict.code = 'merchant_already_connected'; conflict.status = 409; throw conflict;
      }
      throw error;
    }
  }
  async selectLocation(account, merchant, version, location, now) {
    const result = await this.query("UPDATE square_connections SET location_id=?,verified_at=? WHERE account_id=? AND merchant_id=? AND version=? AND status='connected'", location, now, account, merchant, version).run();
    return result.meta.changes === 1;
  }
  async markVerified(account, version, now) {
    await this.query("UPDATE square_connections SET verified_at=?,status=CASE WHEN renewed_at>=? AND expires_at>? THEN 'connected' ELSE status END WHERE account_id=? AND version=? AND token_cipher IS NOT NULL AND status IN ('connected','renewal_failed')", now, now - 8 * 86400000, now, account, version).run();
  }
  async markStatus(account, version, status) {
    await this.query("UPDATE square_connections SET status=? WHERE account_id=? AND version=? AND token_cipher IS NOT NULL AND status!='disconnecting'", status, account, version).run();
  }
  async claimConnection(account, lease, now) {
    return this.query("UPDATE square_connections SET lease=?,lease_until=?,last_attempt_at=? WHERE account_id=? AND token_cipher IS NOT NULL AND status IN ('connected','renewal_failed','reconnect_required') AND lease_until<=? RETURNING *", lease, now + 120000, now, account, now).first();
  }
  async completeRenewal(account, lease, cipher, expires, now) {
    return this.query("UPDATE square_connections SET token_cipher=?,expires_at=?,renewed_at=?,status='connected',lease=NULL,lease_until=0,version=version+1 WHERE account_id=? AND lease=? AND status IN ('connected','renewal_failed','reconnect_required') RETURNING *", cipher, expires, now, account, lease).first();
  }
  failRenewal(account, lease, status) {
    return this.query("UPDATE square_connections SET status=?,lease=NULL,lease_until=0 WHERE account_id=? AND lease=? AND status IN ('connected','renewal_failed','reconnect_required') RETURNING *", status, account, lease).first();
  }
  async dueConnections(now, limit = 100) {
    return (await this.query("SELECT * FROM square_connections WHERE token_cipher IS NOT NULL AND status IN ('connected','renewal_failed') AND lease_until<=? AND (renewed_at<=? OR expires_at<=?) ORDER BY last_attempt_at,renewed_at LIMIT ?", now, now - 7 * 86400000, now + 86400000, Math.min(limit, 100)).all()).results;
  }
  beginDisconnect(account, lease, now) {
    return this.query("UPDATE square_connections SET status='disconnecting',lease=?,lease_until=?,version=version+1 WHERE account_id=? AND token_cipher IS NOT NULL AND lease_until<=? RETURNING *", lease, now + 120000, account, now).first();
  }
  completeDisconnect(account, lease) {
    return this.query("UPDATE square_connections SET merchant_id=NULL,token_cipher=NULL,location_id=NULL,status='disconnected',lease=NULL,lease_until=0,verified_at=NULL,version=version+1 WHERE account_id=? AND lease=? RETURNING *", account, lease).first();
  }
  failDisconnect(account, lease) {
    return this.query("UPDATE square_connections SET status='renewal_failed',lease=NULL,lease_until=0 WHERE account_id=? AND lease=? RETURNING *", account, lease).first();
  }
  clearRevokedConnection(account, now) {
    return this.query("INSERT INTO square_connections(account_id,expires_at,renewed_at,status,authorized_at) VALUES (?,0,0,'disconnected',?) ON CONFLICT(account_id) DO UPDATE SET merchant_id=NULL,location_id=NULL,status='disconnected',lease=NULL,lease_until=0,version=version+1 WHERE token_cipher IS NULL RETURNING *", account, now).first();
  }
  cancelOAuth(account) {
    return this.query('DELETE FROM oauth_attempts WHERE account_id=?', account).run();
  }
  revokeMerchant(merchant, eventAt) {
    return this.query("UPDATE square_connections SET status='reconnect_required',token_cipher=NULL,location_id=NULL,lease=NULL,lease_until=0,verified_at=NULL,version=version+1 WHERE merchant_id=? AND authorized_at<=?", merchant, eventAt).run();
  }
  async rateLimit(key, limit, window, now) {
    const bucket = `${key}:${Math.floor(now / window)}`;
    const row = await this.query('INSERT INTO account_rate_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count', bucket, now + window).first();
    return row.count <= limit;
  }
  async cleanup(now) {
    await this.db.batch([
      this.query('DELETE FROM signin_challenges WHERE expires_at<=?', now),
      this.query('DELETE FROM oauth_attempts WHERE expires_at<=?', now),
      this.query('DELETE FROM account_sessions WHERE expires_at<=?', now),
      this.query('DELETE FROM account_rate_limits WHERE expires_at<=?', now)
    ]);
  }
}

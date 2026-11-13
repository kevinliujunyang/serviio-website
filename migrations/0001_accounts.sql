PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS account_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS account_session_expiry ON account_sessions(expires_at);
CREATE TABLE IF NOT EXISTS restaurants (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id), name TEXT NOT NULL,
 contact_name TEXT NOT NULL, phone TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS signin_challenges (
 token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, locale TEXT NOT NULL,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS signin_expiry ON signin_challenges(expires_at);
CREATE TABLE IF NOT EXISTS oauth_attempts (
 state_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
 session_hash TEXT NOT NULL, locale TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
 connection_version INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_expiry ON oauth_attempts(expires_at);
CREATE TABLE IF NOT EXISTS square_connections (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id), merchant_id TEXT UNIQUE,
 token_cipher TEXT, expires_at INTEGER NOT NULL, renewed_at INTEGER NOT NULL,
 verified_at INTEGER, location_id TEXT,
 status TEXT NOT NULL CHECK(status IN ('connected','reconnect_required','renewal_failed','disconnecting','disconnected')),
 lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
 authorized_at INTEGER NOT NULL, last_attempt_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS square_renewal_due ON square_connections(renewed_at);
CREATE TABLE IF NOT EXISTS account_rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);

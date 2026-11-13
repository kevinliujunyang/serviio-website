const encoder = new TextEncoder();

export function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
}
export function randomToken() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function hashToken(value) {
  return base64url(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
async function keyFor(secret) {
  const bytes = decode(secret);
  if (bytes.length !== 32) throw new Error('A 32-byte encryption key is required');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encrypt(text, secret) {
  const key = await keyFor(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return `v1.${base64url(iv)}.${base64url(data)}`;
}
export async function decrypt(value, secret) {
  const [version, iv, data, extra] = value.split('.');
  if (version !== 'v1' || extra !== undefined) throw new Error('Invalid encrypted credential');
  const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, await keyFor(secret), decode(data));
  return new TextDecoder().decode(result);
}
export function parseCookie(header = '') {
  const cookie = (header || '').split(';').map(x => x.trim()).find(x => x.startsWith('serviio_session='));
  const value = cookie?.slice('serviio_session='.length);
  return /^[A-Za-z0-9_-]{43}$/.test(value || '') ? value : null;
}
export function sessionCookie(token, maxAge = 604800) {
  return `serviio_session=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}

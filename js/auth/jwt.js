const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * Decodes the payload of a JWT (no signature check — that needs a server).
 * @returns {Record<string, unknown>}
 */
export function decodeJwtPayload(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Turns a Google ID token into a session after checking the claims the
 * browser *can* check: issuer, audience and expiry.
 *
 * @returns {{ name: string, email: string, picture: string, expiresAt: number }}
 */
export function sessionFromIdToken(token, { clientId, now = Date.now() }) {
  const claims = decodeJwtPayload(token);

  if (!GOOGLE_ISSUERS.includes(claims.iss)) throw new Error('Token was not issued by Google');
  if (claims.aud !== clientId) throw new Error('Token was issued for a different app');

  const expiresAt = Number(claims.exp) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error('Token has expired');

  return {
    name: String(claims.name ?? claims.email ?? 'Google user'),
    email: String(claims.email ?? ''),
    picture: String(claims.picture ?? ''),
    expiresAt,
  };
}

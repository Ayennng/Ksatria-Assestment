import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decodeJwtPayload, sessionFromIdToken } from '../js/auth/jwt.js';
import { isClientIdConfigured } from '../js/config.js';

const CLIENT_ID = '123-abc.apps.googleusercontent.com';
const NOW = Date.UTC(2026, 0, 1);

function fakeToken(claims) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.signature`;
}

const validClaims = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  exp: NOW / 1000 + 3600,
  name: 'Siti Nurhaliza',
  email: 'siti@example.com',
  picture: 'https://lh3.googleusercontent.com/a/x',
};

test('decodeJwtPayload handles base64url and UTF-8', () => {
  assert.deepEqual(decodeJwtPayload(fakeToken({ name: 'Zoë ✓' })), { name: 'Zoë ✓' });
  assert.throws(() => decodeJwtPayload('not-a-jwt'), /Malformed/);
});

test('sessionFromIdToken returns the profile for a valid token', () => {
  assert.deepEqual(sessionFromIdToken(fakeToken(validClaims), { clientId: CLIENT_ID, now: NOW }), {
    name: 'Siti Nurhaliza',
    email: 'siti@example.com',
    picture: 'https://lh3.googleusercontent.com/a/x',
    expiresAt: NOW + 3600 * 1000,
  });
});

test('sessionFromIdToken rejects wrong issuer, audience or an expired token', () => {
  const check = (claims) => () => sessionFromIdToken(fakeToken({ ...validClaims, ...claims }), { clientId: CLIENT_ID, now: NOW });
  assert.throws(check({ iss: 'https://evil.example' }), /issued by Google/);
  assert.throws(check({ aud: 'other.apps.googleusercontent.com' }), /different app/);
  assert.throws(check({ exp: NOW / 1000 - 1 }), /expired/);
});

test('isClientIdConfigured rejects the placeholder', () => {
  assert.equal(isClientIdConfigured('YOUR_CLIENT_ID.apps.googleusercontent.com'), false);
  assert.equal(isClientIdConfigured(''), false);
  assert.equal(isClientIdConfigured(CLIENT_ID), true);
});

// HS256 access-token verification for the Linky SELF-ROLLED JWT. Mirrors
// linky-mobile/app-mobile/supabase/functions/_shared/jwt.ts (verify half only — this
// app never MINTS tokens, only verifies the ones the Linky backend issued at otp-verify).
//
// The token is `header.payload.signature`, all base64url, signed with LINKY_JWT_SECRET.
// We recompute the signature and timing-safe compare it, reject any alg other than
// HS256 (defeats the `alg:none` / alg-confusion attack), and enforce expiry + a non-empty
// `sub` (the user id). Deno edge runtime — excluded from `npm run verify`.
const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4;
  if (pad) t += '='.repeat(4 - pad);
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface AccessClaims {
  sub: string;
  iat: number;
  exp: number;
  role?: string;
}

export interface VerifiedAccess {
  sub: string;
  claims: AccessClaims;
}

export async function verifyAccessToken(token: string, secret: string): Promise<VerifiedAccess> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT_MALFORMED');
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(headerB64)));
  } catch {
    throw new Error('JWT_BAD_HEADER');
  }
  if (header.alg !== 'HS256') throw new Error('JWT_BAD_ALG'); // reject 'none'/alg-confusion

  const key = await hmacKey(secret);
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, enc.encode(`${headerB64}.${payloadB64}`)),
  );
  if (!timingSafeEqual(expectedSig, b64urlToBytes(sigB64))) throw new Error('JWT_BAD_SIGNATURE');

  let claims: AccessClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
  } catch {
    throw new Error('JWT_BAD_PAYLOAD');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) throw new Error('JWT_EXPIRED');
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) throw new Error('JWT_NO_SUB');
  return { sub: claims.sub, claims };
}

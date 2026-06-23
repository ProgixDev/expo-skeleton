// requireUser — extract + verify the Linky SELF-ROLLED access token from the
// `Authorization: Bearer <token>` header and return the authenticated user id (the
// token's `sub`). Mirrors linky-mobile/app-mobile/supabase/functions/_shared/auth.ts.
//
// This is the driver-app's identity source: the client sends the Linky access token
// (NOT a Supabase Auth session) in the Authorization header and the anon key in
// `apikey`. Because the JWT is app-issued, the Supabase gateway can't verify it, so
// these functions run with `verify_jwt = false` and verify in-function HERE instead.
//
// Throws UnauthorizedError on any failure; callers catch it and return a 401 with the
// Linky French envelope. Deno edge runtime — excluded from `npm run verify`.
import { verifyAccessToken } from './jwt.ts';

export class UnauthorizedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'UnauthorizedError';
  }
}

export async function requireUser(req: Request): Promise<string> {
  const secret = Deno.env.get('LINKY_JWT_SECRET');
  if (!secret) throw new UnauthorizedError('CONFIG_MISSING');
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  if (!m) throw new UnauthorizedError('UNAUTHORIZED');
  try {
    return await verifyAccessToken(m[1], secret).then((v) => v.sub);
  } catch {
    throw new UnauthorizedError('UNAUTHORIZED');
  }
}

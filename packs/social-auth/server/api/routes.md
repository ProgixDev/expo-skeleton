# social-auth — Custom API backbone contract (`POST /auth/oauth`)

When the app runs on the **custom-API preset** (`presets/backend-api`), the client obtains the
native idToken and calls `backend.auth.signInWithIdToken({ provider, token, nonce })`, which POSTs
to **`/auth/oauth`**. Your server **verifies the idToken** with the provider's public keys and
issues **your own** access/refresh tokens — the exact same token pair `POST /auth/login` returns, so
the rest of the app is unchanged.

## Request

```http
POST /auth/oauth
Content-Type: application/json

{
  "provider": "apple" | "google",
  "idToken": "<OIDC JWT from the native SDK>",
  "nonce": "<raw nonce, optional — Apple only>"
}
```

This endpoint is **unauthenticated** (`skipAuth`) — the idToken IS the proof.

## Server steps (verify, never trust the client)

1. **Fetch the provider JWKS** (cache by `kid`):
   - Apple: `https://appleid.apple.com/auth/keys`, issuer `https://appleid.apple.com`.
   - Google: `https://www.googleapis.com/oauth2/v3/certs`, issuer `https://accounts.google.com`.
2. **Verify the JWT signature** (RS256) against the matching JWK.
3. **Validate claims**: `iss` matches the provider; `aud` is one of YOUR client ids (Apple bundle
   id; Google web/iOS/Android client ids); `exp` not expired; for Apple, if a `nonce` was sent,
   `sha256(nonce)` equals the token's `nonce` claim.
4. **Find or create the user** by the verified `sub` (stable per provider) and/or verified `email`.
   Link to an existing account by email only if the provider marked it verified.
5. **Issue your tokens** and respond with the SAME shape as `/auth/login`:

```json
{
  "user": { "id": "…", "email": "…" },
  "accessToken": "…",
  "refreshToken": "…",
  "expiresAt": 1750000000
}
```

## Errors

| Status | When                                      | Client effect                          |
| ------ | ----------------------------------------- | -------------------------------------- |
| 400    | malformed body / missing idToken          | surfaced as a sign-in error            |
| 401    | signature/claims invalid or token expired | surfaced as a sign-in error            |
| 5xx    | JWKS fetch / internal                     | surfaced as a sign-in error, retryable |

User-cancel never reaches the server — the client returns `{ cancelled: true }` before POSTing.

## Notes

- Never accept a client-asserted `userId`/`email`; only the **verified** token claims.
- Rotate nothing client-side: the idToken is single-use proof; your refresh token drives the session.
- Rate-limit `/auth/oauth` like `/auth/login`.

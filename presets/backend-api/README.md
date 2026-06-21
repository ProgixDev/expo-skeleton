# Backend preset — Custom REST + WebSocket API

The alternative backbone for projects that talk to their own server instead of a
BaaS. `progix init --backend api` copies these files into
`src/shared/lib/backend/`, where they expose the **same** seam as the Supabase
preset:

```ts
import { backend } from '@/shared/lib/backend';
await backend.auth.signInWithPassword(email, password);
```

Hand-rolled — **no new npm dependencies** (uses the global `fetch` and
`WebSocket`). Files: `client.ts`, `auth.ts`, `db.ts`, `realtime.ts`,
`storage.ts`, `index.ts`.

## You own token refresh here (unlike BaaS)

With Supabase the SDK auto-refreshes tokens and RLS is the authz boundary. **Here
that responsibility is yours**, and it lives in `client.ts`:

- **Access token in memory** (short-lived, never persisted).
- **Refresh token in `secureStorage`** (Keychain/Keystore) — never AsyncStorage.
- **Single-flight refresh:** on a `401`, ONE refresh runs; concurrent requests
  queue on the same in-flight promise, then retry once with the rotated token.
  The server is expected to **rotate** both tokens on `POST /auth/refresh`.
- **On refresh failure:** the session is cleared (memory + Keychain) and an
  `AuthError` is surfaced so the UI routes to login. `auth.onAuthStateChange`
  emits `null` via the client's `onSessionCleared` hook.
- **Authorization is server-side.** There is no RLS — every endpoint must
  enforce its own access control. The client never decides authz.

## Expected API endpoints

| Method | Path                  | Purpose                                  |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/auth/login`         | `{ email, password }` → tokens + user    |
| POST   | `/auth/refresh`       | `{ refreshToken }` → **rotated** tokens  |
| POST   | `/auth/logout`        | best-effort server-side revocation       |
| GET    | `/auth/me`            | current `{ id, email }`                  |
| \*     | `/...` (via `db`)     | your feature endpoints                   |
| POST   | `/storage/presign`    | presigned upload destination             |
| POST   | `/storage/signed-url` | time-limited download URL                |

WebSocket frames are JSON `{ channel, event, payload }`; the client sends
`{ type: 'subscribe' | 'unsubscribe', channel }` and authenticates with an
`?access_token=` query param (RN `WebSocket` cannot set headers).

## Env vars to add to `src/shared/lib/env.ts` on activation

This preset references the vars below. **`env.ts` is owned by another stream — do
not edit it here.** When you activate this preset, add these to `EnvSchema`:

```ts
EXPO_PUBLIC_API_URL: z.url({ error: 'EXPO_PUBLIC_API_URL must be a valid URL' }), // already present
EXPO_PUBLIC_WS_URL: z.url({ error: 'EXPO_PUBLIC_WS_URL must be a valid URL' }),   // ADD THIS
```

- `EXPO_PUBLIC_API_URL` — REST base URL (already in `env.ts`).
- `EXPO_PUBLIC_WS_URL` — WebSocket base URL, e.g. `wss://api.example.com/realtime`
  (**must be added** — `realtime.ts` reads it).

> Note: `EXPO_PUBLIC_*` is plaintext in the bundle — only the API/WS base URLs go
> there, never secrets. The refresh token lives in `secureStorage`, the access
> token in memory.

## Surface

`{ auth, db, realtime, storage, client }` plus named exports and the same
`Backend*` types as the Supabase preset, so features compile unchanged against
either backbone.

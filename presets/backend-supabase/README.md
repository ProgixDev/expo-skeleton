# Backend preset — Supabase (BaaS)

The **default** backbone for this skeleton. `progix init --backend supabase` copies
these files into `src/shared/lib/backend/`, where they become the single seam the
whole app touches:

```ts
import { backend } from '@/shared/lib/backend';
await backend.auth.signInWithPassword(email, password);
```

These files are thin wrappers over `src/shared/lib/supabase.ts` (the configured
client). They are byte-for-byte the active seam — kept here as the canonical preset
source so the init step is a plain copy.

## What you own vs. what the SDK owns

- **RLS is the authorization boundary.** The app ships the anon/publishable key
  only (`env.ts` rejects a service_role key). Every table is gated by Row-Level
  Security policies — see `supabase/migrations`. Never enforce authz in the client.
- **Token refresh is the SDK's job.** `supabase-js` auto-refreshes the access
  token (`autoRefreshToken: true`) and serialises concurrent refreshes
  (`lock: processLock`). `registerSupabaseAutoRefresh()` only gates refresh to the
  foreground. You do **not** hand-roll a refresh queue here (unlike the API preset).
- **Session is encrypted at rest** in `LargeSecureStore` (AES + Keychain), because
  a Supabase session exceeds the iOS Keychain ~2KB limit.

## Env vars

Already in `src/shared/lib/env.ts`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable — NOT service_role)

## Surface

`{ auth, db, realtime, storage, client }` plus named exports and stable
`Backend*` types. The custom-API preset (`presets/backend-api`) implements the
**same** surface, so features are source-compatible across both backbones.

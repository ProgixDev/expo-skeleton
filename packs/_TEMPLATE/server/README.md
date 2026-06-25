# Server half

A pack has **two halves around one contract**:

- **Client half** (`../src/`) — backbone-AGNOSTIC. Imports only
  `@/shared/lib/backend`, never an SDK. Same code on either backbone.
- **Server half** (this folder) — backbone-SPECIFIC. The endpoints/policies that
  back the client.

`../src/model/schema.ts` (Zod) is the **single shared contract** both halves
mirror. Change it there and update both halves to match.

## Ship ONLY the artifact for your backbone

The app talks to one backbone, chosen at the seam (`src/shared/lib/backend`).
Install the matching server artifact and ignore the other:

| Backbone     | Ship                                                 | What it is                                           |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| **supabase** | `supabase/0010_example.sql`                          | RLS-first migration (deny-by-default, owner-scoped). |
| **api**      | `api/openapi.yaml` + `api/routes.md` + `api/mock.ts` | Endpoint contract, work order, and a dev mock.       |

See `pack.json` → `"server"` for the exact per-backbone file list, and
`"backends"` for which this pack supports.

## Supabase backbone

Copy `supabase/0010_example.sql` into `supabase/migrations/` (next free number),
then `supabase db reset && supabase test db`. RLS is the boundary — owner-scoped
read/write, nothing leaks across users.

## API backbone

1. Hand `api/openapi.yaml` + `api/routes.md` to the backend team — that's the
   contract and the trust rules (auth, server-stamped ownership, validation).
2. Codegen the typed React Query client from the same spec:
   `npx orval --config orval.config.ts` (after copying the pack; adjust the
   input/output paths in `orval.config.ts` per pack).
3. Until the real API exists, wire `api/mock.ts` behind the backend-api preset's
   fetch so the client works in dev with fixtures shaped by the Zod model.

Both backbones must enforce the **same guarantees** (the trust rules in
`api/routes.md` mirror the RLS policies in `supabase/0010_example.sql`).

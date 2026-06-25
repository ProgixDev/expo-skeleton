---
read-when: You need to understand the two-backbone seam, the server-state layer, or the pack server-half — what changed and why
owns: The change log + rationale for the backend-seam upgrade (ADR-0009 / ADR-0010)
---

# Two-backbone upgrade — change log & rationale

This is the durable record of the upgrade that made the skeleton support **two
interchangeable backbones** (Supabase BaaS **or** a custom REST/WebSocket API)
from one codebase — without git branches or a skeleton-per-combination — and
backported the server-state, observability, and analytics layers the skeleton was
missing. The decisions are in [ADR-0009](decisions/0009-backend-seam-two-backbones.md)
and [ADR-0010](decisions/0010-react-query-server-state.md); this doc is the "what we
did, step by step" companion.

## The problem we were solving

Apps split into two kinds of backbone: a **BaaS** (Supabase — RLS is the trust
boundary, the SDK refreshes tokens) and a **custom API** (we own auth, refresh-token
rotation, and the endpoints). A feature written directly against `supabase-js` cannot
move to an API app. We did **not** want N×M skeletons, and we rejected a branch per
backbone (long-lived variants drift; every core fix re-merges N times). We also
rejected full ports-and-adapters (interfaces + DI) as too heavy for two backbones.

The model is **three independent axes**, held together by one seam:

| Axis               | What it is                   | How it's chosen                    |
| ------------------ | ---------------------------- | ---------------------------------- |
| **Backbone**       | Supabase vs custom API       | an init-time **preset** (a folder) |
| **Layering depth** | thin → light-hexagonal → DDD | a **dial**, not a backbone         |
| **Features**       | chat, payments, i18n…        | **packs**, coded against the seam  |

## What changed — step by step

### 1. The backend seam (`src/shared/lib/backend/`)

The single door to the backbone: `backend.auth` / `backend.db` / `backend.realtime`
/ `backend.storage`. Features import the seam and **never** the SDK. The active seam
defaults to the Supabase implementation.

- ESLint `no-restricted-imports` now bans `@supabase/supabase-js` everywhere except
  the seam (and the legacy `supabase.ts` it wraps) — the rule is the enforcement.
- The existing **auth store was refactored onto the seam** (`backend.auth`:
  `signInWithPassword` / `signUp` / `signOut` / `deleteAccount` / `onAuthStateChange`
  / `signInWithIdToken`) so the whole auth feature works unchanged on either backbone.
  It is the reference example for how features consume the seam.

### 2. The two presets (`presets/backend-supabase`, `presets/backend-api`)

Both expose the **same public surface**, so features are source-compatible. They are
**parked** (excluded from tsconfig / ESLint / Jest / Prettier) like `packs/` until
activated by `progix init --backend supabase|api`, which copies one preset into
`src/shared/lib/backend/`.

- `backend-supabase` — RLS is the authz boundary; the SDK owns token refresh; session
  encrypted in `LargeSecureStore`.
- `backend-api` — a fetch client with **single-flight 401 refresh-token rotation**
  (concurrent requests queue on one in-flight refresh, then retry), a reconnecting
  WebSocket (backoff + re-auth), and the refresh token persisted via
  `@/shared/lib/storage`. It needs `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL`
  (add the latter to `env.ts` on activation).

### 3. Server-state, crash, and analytics layers (backported)

- `src/shared/lib/query/` — TanStack Query client + `<AppQueryProvider>` (mounted in
  `src/app/_layout.tsx`) + the **query-key-factory** convention
  (`src/shared/lib/query/query-keys.md`). Server state lives here, not in Zustand.
- `src/shared/lib/observability/` — a typed `crashReporter` seam (dev no-op; swap in
  `@sentry/react-native` for release).
- `src/shared/lib/analytics/` — typed, privacy-safe event helpers; the `analytics`
  pack provides the real PostHog transport.

### 4. Packs gained a server half

A pack is now **two halves**: a backbone-agnostic **client** (`src/`, imports the
seam) and a backbone-specific **server** half — `server/supabase/*.sql` (RLS
migration) **or** `server/api/openapi.yaml` + `routes.md` + `mock.ts`. `model/schema.ts`
(Zod) is the single shared contract. See [`packs/README.md`](../../packs/README.md) and
[`packs/_TEMPLATE/`](../../packs/_TEMPLATE).

- `orval.config.ts` + `npm run api:gen` codegen a typed client from a pack's
  `openapi.yaml` — the custom-API equivalent of `supabase gen types`.
- New **`social-auth`** pack (Apple/Google through the seam); **`i18n`** enriched with
  per-screen domain-merge catalogs.

### 5. Tooling, skills, and docs

- `npm run new:feature` scaffolds a slice with a Zod schema, a seam-backed API file,
  and a React Query hook using a key factory.
- `patch-package` runs on `postinstall`; lint-staged uses `--no-warn-ignored` so
  parked `packs/`/`presets/` files don't fail the pre-commit hook.
- Vendored skills under `.claude/skills/` — `supabase`,
  `supabase-postgres-best-practices`, `react-native-skills` — with an `AGENTS.md`
  rule to call them, not reinvent their guidance.

### 6. Pre-existing gate fixes (so `npm run verify` stays green)

These were latent issues unrelated to the feature, fixed in the same pass:

- Excluded `supabase/functions/` (Deno edge functions) from `tsc` and ESLint — they
  are checked by Deno, not the app toolchain.
- Broadened the Jest `transformIgnorePatterns` allowlist to all `expo-*` packages.
- Created `docs/reports/README.md` (a link in `docs/index.md` pointed at a missing file).

## Verification

`npm run verify` passes end to end: format → lint → typecheck → **38 tests** →
docs-lint (115 files) → secrets-check. The presets are typecheck-clean but **parked**,
so the custom-API backbone is not yet runtime-tested end to end — that needs a live API
to point at.

## Try it

See the hands-on walkthrough in [`DEMO.md`](../../DEMO.md) at the repo root.

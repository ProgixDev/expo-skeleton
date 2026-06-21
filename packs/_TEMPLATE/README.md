# Pack template

Copy this folder to `packs/<name>/` to start a new feature pack. A pack is **logic-first**: ship
the working background (data layer, state, services, realtime, migrations, hooks) and a **minimal,
swappable** UI. See [`../README.md`](../README.md) for the philosophy.

## Two halves around one contract

The app reaches its backbone through one seam, `@/shared/lib/backend` (Supabase BaaS, or a custom
REST/WebSocket API). So a pack has **two halves**:

- **Client half** (`src/`) — **backbone-AGNOSTIC**. Imports only `@/shared/lib/backend`, never an
  SDK (`@supabase/supabase-js`, a generated API client, …). The same code runs on either backbone.
- **Server half** (`server/`) — **backbone-SPECIFIC**. The endpoints/policies that back the client:
  a Supabase RLS migration **or** an OpenAPI contract + dev mock.

`src/model/schema.ts` (Zod) is the **single shared contract** both halves mirror.

## Structure

```
packs/<name>/
├── pack.json              # manifest — deps, env, routes, `backends`, `server` (per-backbone artifacts)
├── README.md              # what it does · the two halves · per-backbone install · keys
├── src/                   # CLIENT half — copied into src/features/<name>/ on install
│   ├── model/schema.ts        # Zod schema + types — THE shared contract (client + server mirror it)
│   ├── data/*-repo.ts         # data layer — imports @/shared/lib/backend, NEVER an SDK
│   ├── use-*.ts               # React Query hooks with a key factory (exampleKeys)
│   ├── ui/*.tsx               # MINIMAL placeholder UI — tag `// DESIGN: replace after Claude Design`
│   └── index.ts               # public API (the barrel)
└── server/                # SERVER half — ship ONLY the artifact for your chosen backbone
    ├── README.md              # the two-half model + which artifact to ship
    ├── supabase/0010_*.sql    # [supabase] RLS-first migration (deny-by-default, owner-scoped)
    └── api/                   # [api]
        ├── openapi.yaml           # OpenAPI 3.1 contract (mirrors the Zod model) — orval codegens from this
        ├── routes.md             # work order: endpoints, auth, server-side trust rules
        └── mock.ts               # dependency-light dev mock (typed handler map) — no MSW
```

## Per-backbone install

Pick the backbone that matches `src/shared/lib/backend`, then install **only** that server artifact
(`pack.json` → `server`). `pack.json` → `backends` lists the supported backbones.

- **supabase** — copy `server/supabase/0010_*.sql` into `supabase/migrations/` (next free number),
  then `supabase db reset && supabase test db`. RLS is the boundary.
- **api** — hand `server/api/openapi.yaml` + `server/api/routes.md` to the backend team; generate the
  typed React Query client with `npx orval --config orval.config.ts` (adjust its paths per pack); and
  wire `server/api/mock.ts` for dev until the real API ships.

See [`server/README.md`](server/README.md) for the full per-backbone steps.

## Rules a pack must follow

- **Backbone-agnostic client**: `src/` imports only `@/shared/*` (esp. `@/shared/lib/backend`) and its
  own folder — never an SDK and no cross-feature imports.
- **One contract**: `model/schema.ts` is the single Zod source; the RLS SQL, the OpenAPI schemas, and
  the mock fixtures all mirror it. Validate at every edge — never trust the wire.
- **Key-free dev**: works with no API keys (free API / sandbox / mock). List real keys in `pack.json`.
- **Secure**: server enforces trust. RLS-first migrations (deny-by-default, owner-scoped) on Supabase;
  the matching trust rules (auth, server-stamped ownership, validation) in `server/api/routes.md` on the
  API backbone. Secrets server-side only; storage via `@/shared/lib/storage`.
- **UI is disposable**: the placeholder UI exists so the logic is demonstrable; the design pass replaces
  it. Keep it token-driven (shared `ui` primitives), no hardcoded hex.
- **Tested logic**: repos/hooks have unit tests (they run once installed into `src/`).

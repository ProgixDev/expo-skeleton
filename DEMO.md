# DEMO — the two-backbone skeleton in practice

A hands-on tour of what the [two-backbone upgrade](docs/architecture/two-backbone-upgrade.md)
gives you. Each section is a short, runnable scenario. Full rationale lives in
[ADR-0009](docs/architecture/decisions/0009-backend-seam-two-backbones.md) and
[ADR-0010](docs/architecture/decisions/0010-react-query-server-state.md).

> TL;DR — one codebase, two backbones (Supabase **or** a custom REST/WebSocket API),
> selected by swapping **one folder**. Features never touch the SDK; they go through
> the seam `@/shared/lib/backend`. Optional features are **packs** you drop in.

---

## 0. Setup

```bash
npm install
npm run verify   # format + lint + typecheck + 38 tests + docs-lint + secrets-check
```

`npm run verify` is the single local gate. It should print all green.

---

## 1. The seam — features never import the SDK

Everything an app does to its backbone goes through one object:

```ts
import { backend } from '@/shared/lib/backend';

await backend.auth.signInWithPassword(email, password);
const { data } = await backend.db.from('tasks').select('*');
const sub = backend.realtime.subscribe('room:42', (msg) => console.log(msg));
const { url } = await backend.storage.upload('avatars/me.png', file);
```

Try to cheat and import the SDK directly in a feature:

```ts
// src/features/anything/model/x.ts
import { createClient } from '@supabase/supabase-js'; // ❌
```

```bash
npm run lint
# error  '@supabase/supabase-js' import is restricted …
#        The backbone is reached only through the seam: @/shared/lib/backend
```

The rule (`no-restricted-imports`) is what keeps features backbone-agnostic.

---

## 2. Pick a backbone (the one-folder swap)

The active seam is `src/shared/lib/backend/`. Two interchangeable **presets** live
parked in `presets/` (excluded from the build until activated):

```
presets/
├── backend-supabase/   # BaaS — RLS is the trust boundary, SDK refreshes tokens
└── backend-api/        # custom REST + WebSocket — single-flight 401 refresh,
                        #   reconnecting WS, refresh token in secure storage
```

Activating one (conceptually what `progix init --backend <name>` automates):

```bash
# Supabase (the default — already active)
cp -R presets/backend-supabase/* src/shared/lib/backend/

# …or the custom API backbone
cp -R presets/backend-api/* src/shared/lib/backend/
# then add EXPO_PUBLIC_API_URL + EXPO_PUBLIC_WS_URL to src/shared/lib/env.ts
```

Because both presets expose the **same surface**, every feature and pack keeps
compiling. No feature code changes. No branch.

> The custom-API preset is where the gnarly part lives — `presets/backend-api/client.ts`
> implements the 401 → refresh → retry flow with a single-flight queue so concurrent
> requests don't each trigger a refresh. Features never see any of it.

---

## 3. Scaffold a feature (generator emits the right shape)

```bash
npm run new:feature -- bookings
```

Creates `src/features/bookings/` with:

```
bookings/
├── index.ts                  # public API (barrel)
├── model/
│   ├── schema.ts             # Zod contract
│   └── use-bookings.ts       # React Query hook + key factory
├── api/bookings-api.ts       # data layer — through @/shared/lib/backend ONLY
└── ui/bookings-screen.tsx
```

The hook already follows the key-factory convention:

```ts
export const bookingsKeys = {
  all: ['bookings'] as const,
  list: () => [...bookingsKeys.all, 'list'] as const,
  detail: (id: string) => [...bookingsKeys.all, 'detail', id] as const,
};
export function useBookings() {
  return useQuery({ queryKey: bookingsKeys.list(), queryFn: () => bookingsApi.list() });
}
```

Server state lives in React Query (`<AppQueryProvider>` is wired in
`src/app/_layout.tsx`); Zustand stays for client/UI state only.

---

## 4. Drop in a pack (the "library of skeletons" idea)

Packs are ready-made feature modules, parked in `packs/`, that cost zero weight until
installed. Browse [`packs/README.md`](packs/README.md). A pack has **two halves**:

```
packs/<name>/
├── src/                # CLIENT half — imports the seam (works on either backbone)
│   ├── model/schema.ts #   the Zod contract (shared by client + server)
│   ├── data/…          #   through @/shared/lib/backend
│   └── ui/…            #   minimal placeholder UI
└── server/             # SERVER half — ship the one matching your backbone
    ├── supabase/*.sql  #   backbone=supabase → RLS migration
    └── api/            #   backbone=api → openapi.yaml + routes.md + mock.ts
```

Install one (what `/add-feature <pack>` automates):

```bash
# copy the client half into the app
cp -R packs/social-auth/src/* src/features/social-auth/

# Supabase backbone → enable the provider (see the pack's server/supabase/README.md)
# custom API backbone → implement server/api/routes.md, then codegen the typed client:
npm run api:gen     # orval reads server/api/openapi.yaml → typed React Query client
```

Until the real endpoints exist, `server/api/mock.ts` lets the client run — same
"key-free dev" idea the Supabase packs already use.

---

## 5. A pack that owns its own endpoints

The contract is one Zod schema, shared by both halves:

```ts
// packs/<name>/src/model/schema.ts  — the single source of truth
export const BookingSchema = z.object({ id: z.string(), startsAt: z.string() });
```

- **Supabase backbone:** the trust logic is an RLS policy + RPC in
  `server/supabase/0010_*.sql`.
- **Custom-API backbone:** the same logic is endpoints described in
  `server/api/openapi.yaml`; `npm run api:gen` turns that spec into a typed client so
  you only write UI.

This is the honest cost of two backbones: the **server half is backbone-specific**
(RLS vs endpoints), but it's bounded — two artifacts per pack — not combinatorial.

---

## 6. The skills any dev/agent should call

Vendored under `.claude/skills/` so they trigger automatically when relevant:

- **`supabase`** — any Supabase work (Auth/RLS/Edge/Storage/migrations).
- **`supabase-postgres-best-practices`** — writing/optimizing Postgres + schema.
- **`react-native-skills`** — RN/Expo components, lists, animations, native modules.

`AGENTS.md` instructs every contributor to invoke the relevant one before writing code
in its domain.

---

## Where to read more

- [Two-backbone upgrade — change log & rationale](docs/architecture/two-backbone-upgrade.md)
- [ADR-0009 — Backend seam: two swappable backbones](docs/architecture/decisions/0009-backend-seam-two-backbones.md)
- [ADR-0010 — React Query for server state; crash + analytics seams](docs/architecture/decisions/0010-react-query-server-state.md)
- [Feature packs catalog](packs/README.md)
- [AGENTS.md](AGENTS.md) — the operating manual

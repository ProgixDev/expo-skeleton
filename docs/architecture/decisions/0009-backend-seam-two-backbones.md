# ADR-0009 — Backend seam: one app, two swappable backbones

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** Progix mobile

## Context

We build apps on two kinds of backbone: a BaaS (Supabase — RLS is the trust
boundary, the SDK owns token refresh) and a custom REST/WebSocket API (we own
auth, refresh-token rotation, and the endpoints). These differ fundamentally in
their data/auth layer, so a feature written directly against `supabase-js` cannot
move to an API app. We do **not** want a skeleton-per-combination, and we do not
want a git branch per backbone (long-lived variants drift; every core fix has to
be re-merged N times). We also rejected full ports-and-adapters (interfaces + DI)
as too heavy for two backbones.

## Decision

The backbone is reached **only** through one seam: `src/shared/lib/backend`
(`backend.auth` / `backend.db` / `backend.realtime` / `backend.storage`). Features
import the seam, never the SDK. The seam has two interchangeable source presets in
`presets/` — `backend-supabase` (default/active) and `backend-api` — that expose
the **same public surface**. `progix init --backend supabase|api` copies the chosen
preset into `src/shared/lib/backend`. Swapping backbone = swapping one folder.

This is three independent axes, not one: **backbone** (this ADR, an init-time
preset), **layering depth** (thin → light-hexagonal — a dial, not a backbone), and
**features** (`packs/`, coded against the seam). The seam is the only coupling point.

## Consequences

- Positive: features are backbone-agnostic; the same `packs/` library installs on
  either backbone; no variant branches; the refresh-token complexity lives in one
  file (`presets/backend-api/client.ts`) and is invisible to features.
- Negative / accepted trade-offs: a pack's **server half** is inherently
  backbone-specific (Supabase = RLS SQL; API = an OpenAPI contract + endpoints) —
  see ADR/`packs/_TEMPLATE/server`. No compile-time guarantee the two presets stay
  in lockstep; with only two presets, a swap surfaces drift immediately.
- Enforcement: ESLint `no-restricted-imports` bans `@supabase/supabase-js` outside
  `src/shared/lib/backend` (and the legacy `supabase.ts` it wraps). `presets/` is
  excluded from tsconfig/ESLint/Jest/Prettier, parked until activated.

## Alternatives considered

- Git branch per backbone — recurring N-way merge conflicts, drift. Rejected.
- Ports & adapters (TS interfaces + DI container) — correct but over-engineered for
  two backbones; the one-folder seam buys ~80% of the benefit at ~10% of the cost.
- A monorepo of backbone packages — overkill until we run several apps at once
  (then: pnpm workspaces + Turborepo, one React/RN version).

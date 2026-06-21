# ADR-0010 — React Query for server state; crash + analytics seams

- **Status:** accepted
- **Date:** 2026-06-21
- **Deciders:** Progix mobile

## Context

The skeleton previously had no server-cache layer — features called the backbone
and pushed results into Zustand by hand, re-implementing caching, dedup, retries,
and pagination per feature. A sibling production app (take-my-pic) had already
proven a clean `@tanstack/react-query` setup plus a crash-reporter seam and a typed
analytics layer. Those three are the skeleton's real infrastructure gaps.

## Decision

- **Server state lives in React Query**, not Zustand. Zustand is for client/UI state
  only. `src/shared/lib/query` owns the client (`createQueryClient`, defaults: 60s
  stale, 5m gc, 2 retries, no refetch-on-focus) and `<AppQueryProvider>` (mounted
  once in `src/app/_layout.tsx`). Every feature exposes a **query-key factory**
  (`fooKeys.all/list()/detail(id)`) and uses `enabled` guards for disabled queries —
  see `src/shared/lib/query/query-keys.md`. `npm run new:feature` scaffolds this.
- **Crash reporting goes through `src/shared/lib/observability`** (`crashReporter`):
  a typed seam with a dev no-op default; the real `@sentry/react-native` transport is
  swapped in for release builds.
- **Analytics goes through `src/shared/lib/analytics`**: a typed `analytics.track`
  whose event helpers (`events.ts`) fix each event name + a privacy-safe primitive
  prop shape. The `analytics` pack provides the real PostHog transport.

## Consequences

- Positive: one caching strategy; less bespoke state; data hooks read uniformly;
  observability and analytics have one swappable sink each. React Query sits cleanly
  above the backend seam (ADR-0009): `hook → api → backend`.
- Negative / accepted trade-offs: one more core dependency; devs must learn the
  key-factory convention (scaffolded + documented to lower that cost).
- Enforcement: `query-client.test.ts` pins the defaults; `new:feature` emits the
  hook/key-factory; analytics props are constrained at the type level + a `sanitize`
  backstop.

## Alternatives considered

- Keep hand-rolled Zustand fetching — duplicated caching logic, no dedup/retry. No.
- SWR — viable, but React Query's mutation/invalidation model and the sibling app's
  proven setup tipped the choice.

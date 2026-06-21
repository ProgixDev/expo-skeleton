/**
 * React Query layer — the app's async-server-state cache.
 *
 * Use `<AppQueryProvider>` once at the root; features call `useQuery`/
 * `useMutation` from `@tanstack/react-query` directly with a key from a
 * per-feature key factory (see `query-keys.md`).
 */
export { createQueryClient } from './query-client';
export { AppQueryProvider } from './provider';

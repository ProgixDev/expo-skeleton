import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient tuned for React Native.
 *
 * RN apps don't have window-focus the way the web does, and mobile networks are
 * flaky, so the defaults below favour fewer surprise refetches plus a small,
 * bounded retry budget. These are deliberate house defaults — features override
 * per-query (e.g. a faster `staleTime` for a live feed) rather than changing
 * them here.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is "fresh" for 60s — avoids refetch storms on quick re-mounts.
        staleTime: 60_000,
        // Keep unused cache entries for 5min before garbage-collecting them.
        gcTime: 5 * 60_000,
        // Bounded retry budget for flaky mobile networks.
        retry: 2,
        // No window-focus concept on RN; refetching on it is noise.
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Mutations are usually non-idempotent — don't silently replay them.
        retry: 0,
      },
    },
  });
}

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from './query-client';

type AppQueryProviderProps = {
  readonly children: ReactNode;
};

/**
 * Wraps the app in a single, stable QueryClient.
 *
 * The client is created lazily inside `useState` so it survives re-renders but
 * is created exactly once per mount (creating it inline in JSX would make a new
 * client every render and blow away the cache). This is what `app/_layout` uses.
 */
export function AppQueryProvider({ children }: AppQueryProviderProps): ReactNode {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

const QUERY_STALE_TIME_MS = 30_000;

/**
 * Builds a `QueryClient` with MARGI AI baseline defaults (`staleTime` 30 s, 1 query retry, 0 mutation retries).
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createAppQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

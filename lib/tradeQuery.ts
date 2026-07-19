/**
 * React Query client for trade catalog screens (category / model).
 * Stale-while-revalidate so back-nav does not re-waterfall RPCs.
 */
import { QueryClient } from '@tanstack/react-query';

export const tradeQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const tradeQueryKeys = {
  categories: (deviceType: string) => ['trade', 'categories', deviceType] as const,
  models: (deviceType: string, category: string) =>
    ['trade', 'models', deviceType, category] as const,
  hasIpad: ['trade', 'has-ipad'] as const,
};

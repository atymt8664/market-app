import { QueryClient } from "@tanstack/react-query";
import { GC_QUERY_DEFAULT_MS } from "@/lib/query-stale-times";

/** Shared client so fetch interceptors and App use the same cache instance */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      /** Evict unused query data — prevents long-session memory growth on mobile (P9). */
      gcTime: GC_QUERY_DEFAULT_MS,
    },
  },
});

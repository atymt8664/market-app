import { QueryClient } from "@tanstack/react-query";

/** Shared client so fetch interceptors and App use the same cache instance */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

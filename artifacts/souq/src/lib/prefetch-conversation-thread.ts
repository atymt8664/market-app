import type { QueryClient } from "@tanstack/react-query";
import {
  getGetConversationQueryOptions,
  getListMessagesQueryKey,
  getListMessagesQueryOptions,
} from "@workspace/api-client-react";
import { GC_THREAD_MESSAGES_MS, STALE_THREAD_MESSAGES_MS } from "@/lib/query-stale-times";

/**
 * Warms React Query cache for a thread (conversation meta + messages).
 * Used on inbox pointerdown and after startConversation before navigate.
 */
export function prefetchConversationThread(
  queryClient: QueryClient,
  convId: number,
): Promise<void> {
  if (!Number.isFinite(convId) || convId <= 0) {
    return Promise.resolve();
  }

  return Promise.all([
    queryClient.prefetchQuery(getGetConversationQueryOptions(convId)),
    queryClient.prefetchQuery(
      getListMessagesQueryOptions(convId, {
        query: {
          queryKey: getListMessagesQueryKey(convId),
          staleTime: STALE_THREAD_MESSAGES_MS,
          gcTime: GC_THREAD_MESSAGES_MS,
        },
      }),
    ),
  ]).then(() => undefined);
}

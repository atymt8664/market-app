import type { QueryClient } from "@tanstack/react-query";
import {
  getGetConversationQueryKey,
  getListMessagesQueryKey,
} from "@workspace/api-client-react";

/**
 * P5 — bust cached thread data after delete-for-me or startConversation reopen.
 * Prevents stale messages / referenced ads from surviving in React Query (60s staleTime).
 */
export function bustConversationThreadCache(
  queryClient: QueryClient,
  convId: number,
): void {
  if (!Number.isFinite(convId) || convId <= 0) return;
  queryClient.removeQueries({ queryKey: getListMessagesQueryKey(convId) });
  queryClient.removeQueries({ queryKey: getGetConversationQueryKey(convId) });
}

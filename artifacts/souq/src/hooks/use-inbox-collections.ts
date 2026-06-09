import { useQuery } from "@tanstack/react-query";
import type { ConversationListItem } from "@workspace/api-client-react";
import {
  fetchBlockedUsers,
  fetchHiddenConversations,
  type BlockedUserListItem,
} from "@/lib/chat-inbox-collections-api";
import { STALE_CONVERSATIONS_MS } from "@/lib/query-stale-times";

export const inboxHiddenQueryKey = () => ["p5", "inbox", "hidden-conversations"] as const;
export const inboxBlockedQueryKey = () => ["p5", "inbox", "blocked-users"] as const;

export function useInboxHiddenConversations(enabled: boolean) {
  return useQuery<ConversationListItem[]>({
    queryKey: inboxHiddenQueryKey(),
    queryFn: fetchHiddenConversations,
    enabled,
    staleTime: STALE_CONVERSATIONS_MS,
    placeholderData: (prev) => prev,
  });
}

type UseInboxBlockedUsersOptions = {
  /** Force fresh list when opening المحظورون screen (post-block from thread). */
  live?: boolean;
};

export function useInboxBlockedUsers(enabled: boolean, options?: UseInboxBlockedUsersOptions) {
  const live = options?.live ?? false;
  return useQuery<BlockedUserListItem[]>({
    queryKey: inboxBlockedQueryKey(),
    queryFn: fetchBlockedUsers,
    enabled,
    staleTime: live ? 0 : STALE_CONVERSATIONS_MS,
    refetchOnMount: live ? "always" : true,
    refetchOnWindowFocus: live,
    placeholderData: live ? undefined : (prev) => prev,
  });
}

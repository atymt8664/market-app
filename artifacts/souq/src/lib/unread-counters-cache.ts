import type { QueryClient } from "@tanstack/react-query";
import {
  computeAppBadgeTotal,
  type UnreadCounters,
} from "@/lib/app-badge-counters";
import { unreadCountQueryKey } from "@/hooks/use-notifications";

export const unreadCountersQueryKey = ["account", "unread-counters"] as const;

function patchCounters(
  queryClient: QueryClient,
  patch: (prev: UnreadCounters) => UnreadCounters,
): void {
  queryClient.setQueryData<UnreadCounters>(unreadCountersQueryKey, (old) => {
    if (!old) return old;
    const next = patch(old);
    return next;
  });
}

export function bumpNotificationsUnreadCount(
  queryClient: QueryClient,
  delta = 1,
): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  patchCounters(queryClient, (prev) => {
    const notifications = Math.max(0, prev.notifications + delta);
    const total = computeAppBadgeTotal(prev.messages, notifications);
    return { ...prev, notifications, total };
  });
  queryClient.setQueryData<{ count: number }>(unreadCountQueryKey, (old) => ({
    count: Math.max(0, (old?.count ?? 0) + delta),
  }));
}

export function bumpMessagesUnreadCount(queryClient: QueryClient, delta = 1): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  patchCounters(queryClient, (prev) => {
    const messages = Math.max(0, prev.messages + delta);
    const total = computeAppBadgeTotal(messages, prev.notifications);
    return { ...prev, messages, total };
  });
}

export function invalidateUnreadCounters(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: unreadCountersQueryKey });
  void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
}

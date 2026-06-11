import type { QueryClient } from "@tanstack/react-query";
import type { AppNotification } from "@/lib/notifications-api";
import { notificationsQueryKey } from "@/hooks/use-notifications";
import {
  bumpNotificationsUnreadCount,
  invalidateUnreadCounters,
} from "@/lib/unread-counters-cache";
import {
  markAllNotificationsReadInList,
  markNotificationReadInList,
  prependNotificationToList,
} from "@/lib/notification-center-list";

export {
  markAllNotificationsReadInList,
  markNotificationReadInList,
  prependNotificationToList,
} from "@/lib/notification-center-list";

export function patchNotificationReadInCache(
  queryClient: QueryClient,
  id: number,
): boolean {
  const prev = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey);
  if (!prev) return false;
  const { next, wasUnread } = markNotificationReadInList(prev, id);
  queryClient.setQueryData(notificationsQueryKey, next);
  if (wasUnread) bumpNotificationsUnreadCount(queryClient, -1);
  return wasUnread;
}

export function patchAllNotificationsReadInCache(queryClient: QueryClient): number {
  const prev = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey);
  if (!prev) return 0;
  const { next, cleared } = markAllNotificationsReadInList(prev);
  queryClient.setQueryData(notificationsQueryKey, next);
  if (cleared > 0) bumpNotificationsUnreadCount(queryClient, -cleared);
  return cleared;
}

export function prependNotificationToCache(
  queryClient: QueryClient,
  notification: AppNotification,
): void {
  const prev = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey);
  if (!prev) {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    return;
  }
  queryClient.setQueryData(
    notificationsQueryKey,
    prependNotificationToList(prev, notification),
  );
}

export function invalidateNotificationCenterQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  invalidateUnreadCounters(queryClient);
}

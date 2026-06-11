import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications-api";
import { STALE_UNREAD_NOTIFICATIONS_MS } from "@/lib/query-stale-times";
import {
  invalidateNotificationCenterQueries,
  patchAllNotificationsReadInCache,
  patchNotificationReadInCache,
} from "@/lib/notification-center-cache";

export const notificationsQueryKey = ["notifications", "list"] as const;
export const unreadCountQueryKey = ["notifications", "unread-count"] as const;

export function useNotificationsQuery(
  options?: Omit<
    UseQueryOptions<AppNotification[], Error>,
    "queryKey" | "queryFn"
  > & { enabled?: boolean },
) {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: ({ signal }) => getNotifications(signal),
    retry: false,
    staleTime: STALE_UNREAD_NOTIFICATIONS_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useUnreadNotificationsCountQuery(
  options?: Omit<UseQueryOptions<{ count: number }, Error>, "queryKey" | "queryFn"> & {
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: ({ signal }) => getUnreadNotificationsCount(signal),
    retry: false,
    staleTime: STALE_UNREAD_NOTIFICATIONS_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey);
      const wasUnread = patchNotificationReadInCache(queryClient, id);
      return { prev, wasUnread };
    },
    onError: (_err, id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(notificationsQueryKey, ctx.prev);
      }
      if (ctx?.wasUnread) {
        invalidateNotificationCenterQueries(queryClient);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["account", "unread-counters"] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const prev = queryClient.getQueryData<AppNotification[]>(notificationsQueryKey);
      const cleared = patchAllNotificationsReadInCache(queryClient);
      return { prev, cleared };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(notificationsQueryKey, ctx.prev);
      }
      if (ctx?.cleared) {
        invalidateNotificationCenterQueries(queryClient);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["account", "unread-counters"] });
    },
  });
}

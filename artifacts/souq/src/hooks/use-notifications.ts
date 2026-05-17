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

function useInvalidateNotificationQueries() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
  };
}

export function useMarkNotificationReadMutation() {
  const invalidate = useInvalidateNotificationQueries();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => invalidate(),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const invalidate = useInvalidateNotificationQueries();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => invalidate(),
  });
}

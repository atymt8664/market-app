import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminNotificationUnreadCount,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationRow,
} from "../api/notifications";

export const adminNotificationsQueryKey = ["admin", "notifications", "list"] as const;
export const adminNotificationsUnreadKey = ["admin", "notifications", "unread-count"] as const;

function patchReadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
) {
  queryClient.setQueryData<AdminNotificationRow[]>(adminNotificationsQueryKey, (prev) => {
    if (!prev) return prev;
    const now = new Date().toISOString();
    return prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n));
  });
}

function patchAllReadInCache(queryClient: ReturnType<typeof useQueryClient>) {
  const now = new Date().toISOString();
  queryClient.setQueryData<AdminNotificationRow[]>(adminNotificationsQueryKey, (prev) => {
    if (!prev) return prev;
    return prev.map((n) => ({ ...n, readAt: n.readAt ?? now }));
  });
}

export function useAdminNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: adminNotificationsQueryKey,
    queryFn: ({ signal }) => getAdminNotifications(signal),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useAdminNotificationUnreadQuery(enabled = true) {
  return useQuery({
    queryKey: adminNotificationsUnreadKey,
    queryFn: ({ signal }) => getAdminNotificationUnreadCount(signal),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useMarkAdminNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAdminNotificationRead(id),
    onSuccess: (_data, id) => {
      patchReadInCache(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: adminNotificationsUnreadKey });
    },
  });
}

export function useMarkAllAdminNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAdminNotificationsRead(),
    onSuccess: () => {
      patchAllReadInCache(queryClient);
      void queryClient.invalidateQueries({ queryKey: adminNotificationsUnreadKey });
    },
  });
}

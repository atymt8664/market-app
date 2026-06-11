import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { fetchUnreadCounters } from "@/lib/unread-counters-api";
import type { UnreadCounters } from "@/lib/app-badge-counters";
import { unreadCountersQueryKey } from "@/lib/unread-counters-cache";
import { STALE_UNREAD_COUNTERS_MS } from "@/lib/query-stale-times";

export { unreadCountersQueryKey };

export function useUnreadCounters(
  options?: Omit<
    UseQueryOptions<UnreadCounters, Error>,
    "queryKey" | "queryFn"
  > & { enabled?: boolean },
) {
  return useQuery({
    queryKey: unreadCountersQueryKey,
    queryFn: ({ signal }) => fetchUnreadCounters(signal),
    retry: false,
    staleTime: STALE_UNREAD_COUNTERS_MS,
    refetchOnWindowFocus: false,
    refetchInterval: STALE_UNREAD_COUNTERS_MS,
    ...options,
  });
}

export function useMessagesUnreadCount(
  options?: Parameters<typeof useUnreadCounters>[0],
): number {
  const { data } = useUnreadCounters(options);
  return data?.messages ?? 0;
}

export function useNotificationsUnreadCount(
  options?: Parameters<typeof useUnreadCounters>[0],
): number {
  const { data } = useUnreadCounters(options);
  return data?.notifications ?? 0;
}

export function useAppBadgeTotal(
  options?: Parameters<typeof useUnreadCounters>[0],
): number {
  const { data } = useUnreadCounters(options);
  return data?.total ?? 0;
}

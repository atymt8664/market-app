import type { QueryClient } from "@tanstack/react-query";
import {
  getAuthMeQueryKey,
  getListConversationsQueryKey,
  getListFavoriteAdsQueryKey,
  getListMyAdsQueryKey,
} from "@workspace/api-client-react";
import { notificationsQueryKey } from "@/hooks/use-notifications";
import { unreadCountersQueryKey } from "@/lib/unread-counters-cache";
import { P17_ORDERS_QUERY_ROOT } from "@/features/p17-commerce/orders-api.types";

/**
 * Drops authenticated-user cache entries without invalidating public listings
 * (home/market/search) — avoids refetch storms after logout or account deletion.
 */
export async function clearUserSessionQueries(
  queryClient: QueryClient,
): Promise<void> {
  queryClient.setQueryData(getAuthMeQueryKey(), null);

  const keys = [
    getAuthMeQueryKey(),
    getListMyAdsQueryKey(),
    getListFavoriteAdsQueryKey(),
    getListConversationsQueryKey(),
    ["/api/conversations"],
    ["/api/ads/mine"],
    ["/api/ads/favorites"],
    notificationsQueryKey,
    unreadCountersQueryKey,
    ["userBlockStatus"],
    ["userPresence"],
  ] as const;

  for (const queryKey of keys) {
    queryClient.removeQueries({ queryKey, exact: false });
  }

  queryClient.removeQueries({ queryKey: P17_ORDERS_QUERY_ROOT, exact: false });
}

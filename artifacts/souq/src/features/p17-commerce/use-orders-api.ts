import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchBuyerOrders,
  fetchOrderDetail,
  fetchOrderTimeline,
  fetchOrdersStats,
  fetchSellerOrders,
} from "./orders-api-client";
import {
  buyerOrdersQueryKey,
  orderDetailQueryKey,
  orderTimelineQueryKey,
  ordersStatsQueryKey,
  sellerOrdersQueryKey,
} from "./orders-api.types";

type QueryOpts = { enabled?: boolean };

export function useOrdersStats(options: QueryOpts = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: userId ? ordersStatsQueryKey(userId) : (["p17", "orders", "stats", "logged-out"] as const),
    queryFn: fetchOrdersStats,
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useBuyerOrdersList(options: QueryOpts = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: userId ? buyerOrdersQueryKey(userId) : (["p17", "orders", "buyer-list", "logged-out"] as const),
    queryFn: fetchBuyerOrders,
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
}

export function useSellerOrdersList(options: QueryOpts = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: userId ? sellerOrdersQueryKey(userId) : (["p17", "orders", "seller-list", "logged-out"] as const),
    queryFn: fetchSellerOrders,
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 60_000,
    retry: 1,
  });
}

/** P17-7A §4.2 — poll while buyer awaits seller / prep (not terminal). */
export const BUYER_DETAIL_POLL_STATUSES = new Set([
  "pending_confirmation",
  "confirmed",
  "preparing",
]);

export function useOrderDetail(
  variant: "buyer" | "seller",
  orderNumber: string | undefined,
  options: QueryOpts = {},
) {
  const { user } = useAuth();
  const userId = user?.id;
  const id = orderNumber?.trim() ?? "";
  return useQuery({
    queryKey:
      userId && id.length > 0
        ? orderDetailQueryKey(userId, variant, id)
        : (["p17", "orders", "detail", "logged-out", variant, id] as const),
    queryFn: () => fetchOrderDetail(id),
    enabled: (options.enabled ?? true) && !!userId && id.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: variant === "buyer" ? "always" : true,
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      if (variant === "buyer" && status && BUYER_DETAIL_POLL_STATUSES.has(status)) {
        return 30_000;
      }
      return false;
    },
    retry: 1,
  });
}

export function useOrderTimeline(orderNumber: string | undefined, options: QueryOpts = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const id = orderNumber?.trim() ?? "";
  return useQuery({
    queryKey:
      userId && id.length > 0
        ? orderTimelineQueryKey(userId, id)
        : (["p17", "orders", "timeline", "logged-out", id] as const),
    queryFn: () => fetchOrderTimeline(id),
    enabled: (options.enabled ?? true) && !!userId && id.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

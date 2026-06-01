import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchOrdersStats } from "./orders-api-client";
import { ordersStatsQueryKey } from "./orders-api.types";

/** @deprecated Use useOrdersStats from use-orders-api.ts */
export function useOrdersStatusSummary(options: { enabled?: boolean } = {}) {
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

export { useOrdersStats, useBuyerOrdersList, useSellerOrdersList } from "./use-orders-api";

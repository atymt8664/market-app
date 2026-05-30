import { useQuery } from "@tanstack/react-query";
import { fetchOrdersStats } from "./orders-api-client";
import { ORDERS_STATS_QUERY_KEY } from "./orders-api.types";

/** @deprecated Use useOrdersStats from use-orders-api.ts */
export function useOrdersStatusSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ORDERS_STATS_QUERY_KEY,
    queryFn: fetchOrdersStats,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  });
}

export { useOrdersStats, useBuyerOrdersList, useSellerOrdersList } from "./use-orders-api";

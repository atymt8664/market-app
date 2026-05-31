import { useQuery } from "@tanstack/react-query";
import {
  fetchBuyerOrders,
  fetchOrderDetail,
  fetchOrderTimeline,
  fetchOrdersStats,
  fetchSellerOrders,
} from "./orders-api-client";
import {
  BUYER_ORDERS_QUERY_KEY,
  orderDetailQueryKey,
  orderTimelineQueryKey,
  ORDERS_STATS_QUERY_KEY,
  SELLER_ORDERS_QUERY_KEY,
} from "./orders-api.types";

type QueryOpts = { enabled?: boolean };

export function useOrdersStats(options: QueryOpts = {}) {
  return useQuery({
    queryKey: ORDERS_STATS_QUERY_KEY,
    queryFn: fetchOrdersStats,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useBuyerOrdersList(options: QueryOpts = {}) {
  return useQuery({
    queryKey: BUYER_ORDERS_QUERY_KEY,
    queryFn: fetchBuyerOrders,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSellerOrdersList(options: QueryOpts = {}) {
  return useQuery({
    queryKey: SELLER_ORDERS_QUERY_KEY,
    queryFn: fetchSellerOrders,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useOrderDetail(
  variant: "buyer" | "seller",
  orderNumber: string | undefined,
  options: QueryOpts = {},
) {
  const id = orderNumber?.trim() ?? "";
  return useQuery({
    queryKey: orderDetailQueryKey(variant, id),
    queryFn: () => fetchOrderDetail(id),
    enabled: (options.enabled ?? true) && id.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useOrderTimeline(orderNumber: string | undefined, options: QueryOpts = {}) {
  const id = orderNumber?.trim() ?? "";
  return useQuery({
    queryKey: orderTimelineQueryKey(id),
    queryFn: () => fetchOrderTimeline(id),
    enabled: (options.enabled ?? true) && id.length > 0,
    staleTime: 30_000,
    retry: 1,
  });
}

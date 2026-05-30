import { useQuery } from "@tanstack/react-query";
import { fetchBuyerOrders, fetchOrdersStats, fetchSellerOrders } from "./orders-api-client";
import {
  BUYER_ORDERS_QUERY_KEY,
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

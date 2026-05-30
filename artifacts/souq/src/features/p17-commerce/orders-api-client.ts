import { apiUrl } from "@/lib/api-url";
import type { OrdersListResponse, OrdersStats } from "./orders-api.types";

async function readJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: "include" });
  if (!res.ok) {
    throw new Error(`orders_api_${path}_${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchOrdersStats(): Promise<OrdersStats> {
  return readJson<OrdersStats>("/api/orders/stats");
}

export function fetchBuyerOrders(): Promise<OrdersListResponse> {
  return readJson<OrdersListResponse>("/api/orders");
}

export function fetchSellerOrders(): Promise<OrdersListResponse> {
  return readJson<OrdersListResponse>("/api/orders/seller");
}

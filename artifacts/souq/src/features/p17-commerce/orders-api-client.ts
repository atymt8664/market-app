import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";
import { OrdersApiClientError, type OrdersApiErrorPayload } from "./orders-api-errors";
import type {
  CreateOrderBody,
  CreateOrderResponse,
  OrderDetailResponse,
  OrderActionResponse,
  OrdersListResponse,
  OrdersStats,
  OrderTimelineResponse,
} from "./orders-api.types";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: "include", ...init });
  const body = (await res.json().catch(() => ({}))) as T & OrdersApiErrorPayload;
  if (!res.ok) {
    throw new OrdersApiClientError(res.status, body);
  }
  return body as T;
}

function csrfHeaders(): Record<string, string> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  if (typeof csrf === "string" && csrf.length >= 32) {
    return { "X-CSRF-Token": csrf };
  }
  return {};
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

export function fetchOrderDetail(orderNumber: string): Promise<OrderDetailResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderDetailResponse>(`/api/orders/${id}`);
}

export function fetchOrderTimeline(orderNumber: string): Promise<OrderTimelineResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderTimelineResponse>(`/api/orders/${id}/timeline`);
}

export function createBuyerOrder(
  body: CreateOrderBody,
  idempotencyKey: string,
): Promise<CreateOrderResponse> {
  return readJson<CreateOrderResponse>("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

export function cancelBuyerOrder(orderNumber: string): Promise<OrderActionResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderActionResponse>(`/api/orders/${id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({}),
  });
}

export function acceptSellerOrder(orderNumber: string): Promise<OrderActionResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderActionResponse>(`/api/orders/${id}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({}),
  });
}

export function rejectSellerOrder(orderNumber: string): Promise<OrderActionResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderActionResponse>(`/api/orders/${id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({}),
  });
}

export function startPreparingSellerOrder(orderNumber: string): Promise<OrderActionResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderActionResponse>(`/api/orders/${id}/start-preparing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify({}),
  });
}

export function markShippedSellerOrder(
  orderNumber: string,
  body: { carrierLabel: string; trackingNumber: string },
): Promise<OrderActionResponse> {
  const id = encodeURIComponent(orderNumber.trim());
  return readJson<OrderActionResponse>(`/api/orders/${id}/mark-shipped`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(body),
  });
}

/** Resolve active order number for buyer+ad when API returns ORDER_DUPLICATE_ACTIVE. */
export async function findActiveOrderNumberForAd(adId: number): Promise<string | null> {
  const { items } = await fetchBuyerOrders();
  const candidates = items.filter(
    (i) => i.status === "pending_confirmation" || i.status === "confirmed",
  );
  for (const item of candidates) {
    try {
      const detail = await fetchOrderDetail(item.orderNumber);
      if (detail.order.adId === adId) return detail.order.orderNumber;
    } catch {
      continue;
    }
  }
  return null;
}

import { useCallback } from "react";
import { useLocation } from "wouter";

export type OrderHubVariant = "buyer" | "seller";

export function getBuyerOrderDetailPath(orderId: string): string {
  const id = orderId.trim();
  return `/orders/${encodeURIComponent(id)}`;
}

export function getSellerOrderDetailPath(orderId: string): string {
  const id = orderId.trim();
  return `/seller-orders/${encodeURIComponent(id)}`;
}

export function getOrderDetailPath(variant: OrderHubVariant, orderId: string): string {
  return variant === "buyer" ? getBuyerOrderDetailPath(orderId) : getSellerOrderDetailPath(orderId);
}

export function getOrdersListPath(variant: OrderHubVariant): string {
  return variant === "buyer" ? "/orders" : "/seller-orders";
}

/** orderId → navigate() — ready for real list data; no mock IDs. */
export function useNavigateToOrderDetail() {
  const [, navigate] = useLocation();

  return useCallback(
    (variant: OrderHubVariant, orderId: string) => {
      const id = orderId.trim();
      if (!id) return;
      navigate(getOrderDetailPath(variant, id));
    },
    [navigate],
  );
}

import { useAuth } from "@/hooks/use-auth";
import { useBuyerOrdersList, useSellerOrdersList } from "./use-orders-api";
import type { OrderListItem } from "./orders-api.types";

export type OrdersHubData = {
  orders: OrderListItem[];
  /** True while auth or orders query has not settled — never show empty state yet. */
  isResolving: boolean;
  isMock: boolean;
};

/**
 * Hub list data — wired to orders API hooks.
 * Returns empty list until settled; surfaces mock flag for P17-4A gating.
 */
export function useOrdersHubData(variant: "buyer" | "seller"): OrdersHubData {
  const { user, isLoading: authLoading } = useAuth();
  const buyerQuery = useBuyerOrdersList({ enabled: variant === "buyer" });
  const sellerQuery = useSellerOrdersList({ enabled: variant === "seller" });
  const query = variant === "buyer" ? buyerQuery : sellerQuery;

  const orders = query.data?.items ?? [];
  const hasOrders = orders.length > 0;
  const querySettled = query.isFetched && query.fetchStatus === "idle";
  const isResolving = authLoading || !user || (!hasOrders && !querySettled);

  return {
    orders,
    isResolving,
    isMock: query.data?.mock ?? false,
  };
}

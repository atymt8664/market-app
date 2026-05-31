import { useBuyerOrdersList, useSellerOrdersList } from "./use-orders-api";
import type { OrderListItem } from "./orders-api.types";

export type OrdersHubData = {
  orders: OrderListItem[];
  isLoading: boolean;
  isMock: boolean;
};

/**
 * Hub list data — wired to orders API hooks.
 * Returns empty list on loading/error; surfaces mock flag for P17-4A gating.
 */
export function useOrdersHubData(variant: "buyer" | "seller"): OrdersHubData {
  const buyerQuery = useBuyerOrdersList({ enabled: variant === "buyer" });
  const sellerQuery = useSellerOrdersList({ enabled: variant === "seller" });
  const query = variant === "buyer" ? buyerQuery : sellerQuery;

  return {
    orders: query.data?.items ?? [],
    isLoading: query.isLoading,
    isMock: query.data?.mock ?? false,
  };
}

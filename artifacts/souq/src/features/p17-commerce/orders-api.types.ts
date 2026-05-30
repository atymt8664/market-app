export type OrdersStats = {
  new: number;
  confirming: number;
  preparing: number;
  shipping: number;
  completed: number;
  issues: number;
  mock: true;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabelAr: string;
  title: string;
  totalAmount: string;
  currency: string;
  updatedAt: string;
  updatedAtRelativeAr: string;
};

export type OrdersListResponse = {
  items: OrderListItem[];
  total: number;
  mock: true;
};

export const ORDERS_STATS_QUERY_KEY = ["p17", "orders", "stats"] as const;
export const BUYER_ORDERS_QUERY_KEY = ["p17", "orders", "buyer-list"] as const;
export const SELLER_ORDERS_QUERY_KEY = ["p17", "orders", "seller-list"] as const;

/** @deprecated P17-4A key — use ORDERS_STATS_QUERY_KEY */
export const ORDERS_STATUS_SUMMARY_QUERY_KEY = ORDERS_STATS_QUERY_KEY;

export function isOrdersStatsEmpty(stats: OrdersStats): boolean {
  return (
    stats.new === 0 &&
    stats.confirming === 0 &&
    stats.preparing === 0 &&
    stats.shipping === 0 &&
    stats.completed === 0 &&
    stats.issues === 0
  );
}

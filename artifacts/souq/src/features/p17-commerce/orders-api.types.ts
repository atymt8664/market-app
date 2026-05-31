export type OrdersStats = {
  new: number;
  confirming: number;
  preparing: number;
  shipping: number;
  completed: number;
  issues: number;
  mock: boolean;
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

export type OrderShipment = {
  carrierLabel: string;
  trackingNumber: string;
  shippedAt: string | null;
};

export type OrderBuyerAddress = {
  city: string;
  countryCode: string;
  postalCode: string | null;
  line1: string;
  recipientName: string | null;
};

export type OrderDetail = OrderListItem & {
  fulfillmentMode: "shipping" | "pickup";
  buyerUserId: number;
  sellerUserId: number;
  adId: number;
  subtotalAmount: string;
  shippingAmount: string;
  createdAt: string;
  issueFlag: boolean;
  version?: number;
  shipment?: OrderShipment | null;
  buyerAddress?: OrderBuyerAddress | null;
};

export type MarkShippedBody = {
  carrierLabel: string;
  trackingNumber: string;
};

export type OrdersListResponse = {
  items: OrderListItem[];
  total: number;
  mock: boolean;
};

export type OrderDetailResponse = {
  order: OrderDetail;
  mock: boolean;
};

export type CreateOrderBody = {
  adId: number;
  fulfillmentMode: "pickup";
  currency?: string;
  idempotencyKey?: string;
};

export type CreateOrderResponse = {
  order: OrderDetail;
  mock: boolean;
};

export type OrderActionResponse = {
  order: OrderDetail;
  mock: boolean;
};

export type OrderTimelineEntry = {
  id: string;
  eventCode: string;
  messageAr: string;
  occurredAt: string;
};

export type OrderTimelineResponse = {
  orderId: string;
  items: OrderTimelineEntry[];
  mock: boolean;
};

export const ORDERS_STATS_QUERY_KEY = ["p17", "orders", "stats"] as const;
export const BUYER_ORDERS_QUERY_KEY = ["p17", "orders", "buyer-list"] as const;
export const SELLER_ORDERS_QUERY_KEY = ["p17", "orders", "seller-list"] as const;

export function orderDetailQueryKey(variant: "buyer" | "seller", orderNumber: string) {
  return ["p17", "orders", "detail", variant, orderNumber] as const;
}

export function orderTimelineQueryKey(orderNumber: string) {
  return ["p17", "orders", "timeline", orderNumber] as const;
}

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

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
  /** Optional API enrichment — shown only when present (P17-8-0 §1.8). */
  etaAt?: string | null;
};

export type OrderBuyerAddress = {
  city: string;
  countryCode: string;
  postalCode: string | null;
  line1: string;
  line2: string | null;
  recipientName: string | null;
  phone: string | null;
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

export type CreateOrderBody =
  | {
      adId: number;
      fulfillmentMode: "pickup";
      currency?: string;
      idempotencyKey?: string;
    }
  | {
      adId: number;
      fulfillmentMode: "shipping";
      currency?: string;
      shippingAmount?: string;
      idempotencyKey?: string;
      buyerAddress: {
        recipientName: string;
        phone: string;
        countryCode: string;
        city: string;
        postalCode: string;
        line1: string;
        line2: string;
        label?: string;
      };
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

/** Root prefix for all P17 orders React Query entries — clear on logout/login. */
export const P17_ORDERS_QUERY_ROOT = ["p17", "orders"] as const;

export function ordersStatsQueryKey(userId: number) {
  return [...P17_ORDERS_QUERY_ROOT, "stats", userId] as const;
}

export function buyerOrdersQueryKey(userId: number) {
  return [...P17_ORDERS_QUERY_ROOT, "buyer-list", userId] as const;
}

export function sellerOrdersQueryKey(userId: number) {
  return [...P17_ORDERS_QUERY_ROOT, "seller-list", userId] as const;
}

export function orderDetailQueryKey(
  userId: number,
  variant: "buyer" | "seller",
  orderNumber: string,
) {
  return [...P17_ORDERS_QUERY_ROOT, "detail", userId, variant, orderNumber] as const;
}

export function orderTimelineQueryKey(userId: number, orderNumber: string) {
  return [...P17_ORDERS_QUERY_ROOT, "timeline", userId, orderNumber] as const;
}

/** @deprecated P17-4A key — use ordersStatsQueryKey(userId) */
export function ordersStatusSummaryQueryKey(userId: number) {
  return ordersStatsQueryKey(userId);
}

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

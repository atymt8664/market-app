import type { OrderDetail, OrderListItem, OrdersStats } from "./orders-schemas";
import { OrderIssueSchema, OrderTimelineEntrySchema } from "./orders-schemas";
import { z } from "zod";

type OrderIssue = z.infer<typeof OrderIssueSchema>;
type OrderTimelineEntry = z.infer<typeof OrderTimelineEntrySchema>;

/** P17-4B — static mock catalog; swap provider for DB in P17-4+. */
export const P17_MOCK_BUYER_ORDER_ID = "mock-buyer-001";
export const P17_MOCK_SELLER_ORDER_IDS = [
  "mock-seller-001",
  "mock-seller-002",
  "mock-seller-003",
] as const;

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const P17_MOCK_BUYER_ORDERS: OrderListItem[] = [
  {
    id: P17_MOCK_BUYER_ORDER_ID,
    orderNumber: "SOUQ-2026-001001",
    status: "pending_confirmation",
    statusLabelAr: "بانتظار التأكيد",
    title: "iPhone 14 Pro — معاينة",
    totalAmount: "650.00",
    currency: "EUR",
    updatedAt: hoursAgo(2),
    updatedAtRelativeAr: "منذ ساعتين",
  },
];

export const P17_MOCK_SELLER_ORDERS: OrderListItem[] = [
  {
    id: P17_MOCK_SELLER_ORDER_IDS[0],
    orderNumber: "SOUQ-2026-001101",
    status: "pending_confirmation",
    statusLabelAr: "طلب جديد",
    title: "ساعة Apple Watch — معاينة",
    totalAmount: "120.00",
    currency: "EUR",
    updatedAt: hoursAgo(1),
    updatedAtRelativeAr: "منذ ساعة",
  },
  {
    id: P17_MOCK_SELLER_ORDER_IDS[1],
    orderNumber: "SOUQ-2026-001102",
    status: "preparing",
    statusLabelAr: "بانتظار التجهيز",
    title: "حقيبة جلد — معاينة",
    totalAmount: "45.00",
    currency: "EUR",
    updatedAt: hoursAgo(5),
    updatedAtRelativeAr: "منذ 5 ساعات",
  },
  {
    id: P17_MOCK_SELLER_ORDER_IDS[2],
    orderNumber: "SOUQ-2026-001103",
    status: "shipped",
    statusLabelAr: "تم الشحن",
    title: "سماعات Bluetooth — معاينة",
    totalAmount: "35.00",
    currency: "EUR",
    updatedAt: hoursAgo(24),
    updatedAtRelativeAr: "منذ يوم",
  },
];

export const P17_MOCK_ORDERS_STATS: OrdersStats = {
  new: 0,
  confirming: 1,
  preparing: 1,
  shipping: 1,
  completed: 0,
  issues: 0,
  mock: true,
};

const ORDER_DETAILS: Record<string, OrderDetail> = {
  [P17_MOCK_BUYER_ORDER_ID]: {
    ...P17_MOCK_BUYER_ORDERS[0],
    fulfillmentMode: "shipping",
    buyerUserId: 1001,
    sellerUserId: 2001,
    adId: 3001,
    subtotalAmount: "620.00",
    shippingAmount: "30.00",
    createdAt: hoursAgo(3),
    issueFlag: false,
  },
  [P17_MOCK_SELLER_ORDER_IDS[0]]: {
    ...P17_MOCK_SELLER_ORDERS[0],
    fulfillmentMode: "shipping",
    buyerUserId: 1002,
    sellerUserId: 2001,
    adId: 3002,
    subtotalAmount: "110.00",
    shippingAmount: "10.00",
    createdAt: hoursAgo(2),
    issueFlag: false,
  },
  [P17_MOCK_SELLER_ORDER_IDS[1]]: {
    ...P17_MOCK_SELLER_ORDERS[1],
    fulfillmentMode: "pickup",
    buyerUserId: 1003,
    sellerUserId: 2001,
    adId: 3003,
    subtotalAmount: "45.00",
    shippingAmount: "0.00",
    createdAt: hoursAgo(6),
    issueFlag: false,
  },
  [P17_MOCK_SELLER_ORDER_IDS[2]]: {
    ...P17_MOCK_SELLER_ORDERS[2],
    fulfillmentMode: "shipping",
    buyerUserId: 1004,
    sellerUserId: 2001,
    adId: 3004,
    subtotalAmount: "30.00",
    shippingAmount: "5.00",
    createdAt: hoursAgo(30),
    issueFlag: false,
  },
};

const ORDER_TIMELINES: Record<string, OrderTimelineEntry[]> = {
  [P17_MOCK_BUYER_ORDER_ID]: [
    {
      id: "tl-001",
      eventCode: "order_submitted",
      messageAr: "تم إنشاء الطلب",
      occurredAt: hoursAgo(3),
    },
    {
      id: "tl-002",
      eventCode: "awaiting_seller",
      messageAr: "بانتظار تأكيد البائع",
      occurredAt: hoursAgo(2),
    },
  ],
};

const ORDER_ISSUES: Record<string, OrderIssue[]> = {};

export function getMockBuyerOrders(): OrderListItem[] {
  return P17_MOCK_BUYER_ORDERS;
}

export function getMockSellerOrders(): OrderListItem[] {
  return P17_MOCK_SELLER_ORDERS;
}

export function getMockOrdersStats(): OrdersStats {
  return P17_MOCK_ORDERS_STATS;
}

export function getMockOrderById(orderId: string): OrderDetail | null {
  return ORDER_DETAILS[orderId] ?? null;
}

export function getMockOrderTimeline(orderId: string): OrderTimelineEntry[] {
  return ORDER_TIMELINES[orderId] ?? [];
}

export function getMockOrderIssues(orderId: string): OrderIssue[] {
  return ORDER_ISSUES[orderId] ?? [];
}

export function isKnownMockOrderId(orderId: string): boolean {
  return orderId in ORDER_DETAILS;
}

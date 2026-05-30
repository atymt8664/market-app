import assert from "node:assert/strict";
import {
  OrdersListResponseSchema,
  OrdersStatsSchema,
  OrderDetailResponseSchema,
  OrderTimelineResponseSchema,
  OrderIssuesResponseSchema,
} from "./orders-schemas.ts";

const stats = OrdersStatsSchema.parse({
  new: 0,
  confirming: 1,
  preparing: 1,
  shipping: 1,
  completed: 0,
  issues: 0,
  mock: true,
});
assert.equal(stats.mock, true);

const buyerList = OrdersListResponseSchema.parse({
  items: [
    {
      id: "mock-buyer-001",
      orderNumber: "SOUQ-2026-001001",
      status: "pending_confirmation",
      statusLabelAr: "بانتظار التأكيد",
      title: "iPhone 14 Pro — معاينة",
      totalAmount: "650.00",
      currency: "EUR",
      updatedAt: new Date().toISOString(),
      updatedAtRelativeAr: "منذ ساعتين",
    },
  ],
  total: 1,
  mock: true,
});
assert.equal(buyerList.items[0]?.orderNumber, "SOUQ-2026-001001");

const detail = OrderDetailResponseSchema.parse({
  order: {
    ...buyerList.items[0],
    fulfillmentMode: "shipping",
    buyerUserId: 1001,
    sellerUserId: 2001,
    adId: 3001,
    subtotalAmount: "620.00",
    shippingAmount: "30.00",
    createdAt: new Date().toISOString(),
    issueFlag: false,
  },
  mock: true,
});
assert.equal(detail.order.statusLabelAr, "بانتظار التأكيد");

const timeline = OrderTimelineResponseSchema.parse({
  orderId: "mock-buyer-001",
  items: [
    {
      id: "tl-001",
      eventCode: "order_submitted",
      messageAr: "تم إنشاء الطلب",
      occurredAt: new Date().toISOString(),
    },
  ],
  mock: true,
});
assert.ok(timeline.items.length >= 1);

const issues = OrderIssuesResponseSchema.parse({
  orderId: "mock-buyer-001",
  items: [],
  mock: true,
});
assert.equal(issues.items.length, 0);

console.log("orders-ready-layer.test.mjs: PASS");

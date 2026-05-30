import assert from "node:assert/strict";
import {
  OrdersStatusSummarySchema,
  P17_ORDERS_STATUS_SUMMARY_MOCK,
} from "./orders-status-summary.ts";

const parsed = OrdersStatusSummarySchema.parse(P17_ORDERS_STATUS_SUMMARY_MOCK);
assert.deepEqual(parsed, {
  new: 0,
  confirming: 0,
  preparing: 0,
  shipping: 0,
  completed: 0,
  issues: 0,
});

assert.throws(() => OrdersStatusSummarySchema.parse({ new: -1 }));

console.log("orders-status-summary.test.mjs: PASS");

import assert from "node:assert/strict";
import {
  ORDER_STATUSES,
  FULFILLMENT_MODES,
  ORDER_ACTOR_TYPES,
  ORDER_ISSUE_CATEGORIES,
  ORDER_ISSUE_STATUSES,
  SHIPMENT_EVENT_CODES,
  SHIPMENT_EVENT_SOURCES,
  ORDER_STATUS_SQL_IN,
} from "./constants.ts";

const P17_TABLES = [
  "orders",
  "order_items",
  "order_status_history",
  "buyer_addresses",
  "shipments",
  "shipment_events",
  "order_issues",
];

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

assert.equal(ORDER_STATUSES.length, 11);
assert.equal(FULFILLMENT_MODES.length, 2);
assert.equal(ORDER_ACTOR_TYPES.length, 4);
assert.equal(ORDER_ISSUE_CATEGORIES.length, 5);
assert.equal(ORDER_ISSUE_STATUSES.length, 4);
assert.equal(SHIPMENT_EVENT_CODES.length, 4);
assert.equal(SHIPMENT_EVENT_SOURCES.length, 3);
assert.equal(P17_TABLES.length, 7);

assert.ok(ORDER_STATUSES.includes("draft"));
assert.ok(!ORDER_STATUSES.includes("pending_payment"));
assert.ok(!ORDER_STATUSES.includes("seller_confirmation_required"));
assert.ok(!ORDER_STATUSES.includes("issue_opened"));

const forbiddenPaymentStatuses = [
  "pending_payment",
  "paid",
  "refunded",
  "disputed",
  "payout_pending",
  "payout_completed",
];
for (const status of forbiddenPaymentStatuses) {
  assert.ok(
    !ORDER_STATUSES.includes(status),
    `P10 status must not appear in v1 schema: ${status}`,
  );
}

assert.match(ORDER_STATUS_SQL_IN, /'draft'/);
assert.match(ORDER_STATUS_SQL_IN, /'cancelled'/);

for (const status of ORDER_STATUSES) {
  assert.equal(
    TERMINAL_STATUSES.has(status),
    status === "completed" || status === "cancelled",
  );
}

console.log("p17/schema-validation.test.mjs: PASS");

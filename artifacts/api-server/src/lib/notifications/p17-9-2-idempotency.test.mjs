import assert from "node:assert/strict";
import { notificationsTable } from "@workspace/db/schema";
import { buildInAppJobIdempotencyKey } from "./idempotency";
import { buildNotificationInsertValues } from "./insert-values";
import {
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_DOMAIN_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
  toNotificationApiRow,
} from "./contract";

// --- job idempotency key ---
const withDedup = {
  userId: 7,
  type: "message.received",
  title: "Hi",
  body: "",
  entityType: "conversation",
  entityId: 3,
  metadata: { messageId: 99 },
  foundation: {
    domain: "messages",
    category: "messages",
    priority: 1,
    dedupKey: "msg:7:3:99",
    aggregationKey: "agg:msg:conv:7:3",
    deepLinkPath: "/messages/3",
  },
};

assert.equal(
  buildInAppJobIdempotencyKey(withDedup),
  "notify.in_app:dedup:7:msg:7:3:99",
);

const withoutDedup = {
  userId: 2,
  type: "announcement.system",
  title: "Hello",
  body: "World",
  entityType: null,
  entityId: null,
  metadata: null,
};

const legacyKey = buildInAppJobIdempotencyKey(withoutDedup);
assert.ok(legacyKey.startsWith("notify.in_app:2:announcement.system:none:"));
assert.equal(legacyKey.length > 40, true);

// --- insert values ---
const insertValues = buildNotificationInsertValues(withDedup);
assert.equal(insertValues.dedupKey, "msg:7:3:99");
assert.equal(insertValues.aggregationKey, "agg:msg:conv:7:3");
assert.equal(insertValues.priority, 1);
assert.equal(insertValues.category, "messages");
assert.equal(insertValues.domain, "messages");

const orderInsert = buildNotificationInsertValues({
  userId: 1,
  type: "order.shipped",
  title: "Shipped",
  body: "",
  entityType: null,
  entityId: null,
  metadata: { order_number: "SOUQ-2026-000001", role: "buyer" },
});
assert.equal(orderInsert.dedupKey, "order:1:SOUQ-2026-000001:order.shipped");
assert.equal(orderInsert.category, "orders");
assert.equal(orderInsert.domain, "orders");

// --- API contract mapper ---
const apiRow = toNotificationApiRow({
  id: 10,
  userId: 1,
  type: "ad.approved",
  title: "Approved",
  body: "",
  entityType: "ad",
  entityId: 5,
  metadata: null,
  dedupKey: "ad:1:5:ad.approved",
  aggregationKey: null,
  priority: 1,
  category: "marketplace",
  domain: "marketplace",
  readAt: null,
  createdAt: new Date("2026-06-10T12:00:00.000Z"),
});
assert.equal(apiRow.id, 10);
assert.equal(apiRow.category, "marketplace");
assert.equal(apiRow.domain, "marketplace");
assert.equal(apiRow.priority, 1);
assert.equal(apiRow.dedupKey, "ad:1:5:ad.approved");
assert.equal(apiRow.deepLinkPath, "/ad/5");

// --- drizzle schema columns exist (contract ↔ DB alignment) ---
const columnNames = Object.keys(notificationsTable);
assert.ok(columnNames.includes("dedupKey"));
assert.ok(columnNames.includes("aggregationKey"));
assert.ok(columnNames.includes("priority"));
assert.ok(columnNames.includes("category"));
assert.ok(columnNames.includes("domain"));

assert.equal(NOTIFICATION_CATEGORY_VALUES.length, 10);
assert.equal(NOTIFICATION_DOMAIN_VALUES.length, 11);
assert.deepEqual([...NOTIFICATION_PRIORITY_VALUES], [0, 1, 2, 3]);

console.log("p17-9-2-idempotency.test.mjs: OK");

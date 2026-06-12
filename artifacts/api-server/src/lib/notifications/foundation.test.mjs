import assert from "node:assert/strict";
import { resolveNotificationFoundation } from "./foundation";
import { buildNotificationDedupKey, isValidDedupKey } from "./dedup-key";
import { buildNotificationAggregationKey } from "./aggregation-key";
import { notificationDeepLinkPath } from "./deep-link";
import {
  resolveNotificationCategory,
  resolveNotificationDomain,
  resolveNotificationPriority,
  resolvePreferenceColumnForType,
} from "./catalog";

// --- catalog ---
assert.equal(resolveNotificationDomain("message.received"), "messages");
assert.equal(resolveNotificationCategory("message.received"), "messages");
assert.equal(resolveNotificationPriority("message.received"), 1);

assert.equal(resolveNotificationDomain("order.shipped"), "orders");
assert.equal(resolveNotificationCategory("order.shipped"), "orders");
assert.equal(resolveNotificationPriority("order.shipped"), 1);

assert.equal(resolveNotificationDomain("verification.approved"), "verification");
assert.equal(resolveNotificationCategory("verification.approved"), "trust_safety");
assert.equal(resolveNotificationPriority("verification.approved"), 1);

assert.equal(resolveNotificationDomain("security.login_alert"), "security");
assert.equal(resolveNotificationPriority("security.login_alert"), 0);

assert.equal(resolveNotificationDomain("admin.report_escalated"), "admin");
assert.equal(resolveNotificationCategory("admin.report_escalated"), "admin");

assert.equal(resolvePreferenceColumnForType("message.received"), "notifyMessages");
assert.equal(resolvePreferenceColumnForType("order.shipped"), null);
assert.equal(resolvePreferenceColumnForType("verification.approved"), null);

// --- dedup keys ---
assert.equal(
  buildNotificationDedupKey({
    userId: 5,
    type: "message.received",
    entityType: "conversation",
    entityId: 10,
    metadata: { messageId: 99 },
  }),
  "msg:5:10:99",
);

assert.equal(
  buildNotificationDedupKey({
    userId: 5,
    type: "order.shipped",
    metadata: { order_number: "SOUQ-2026-000042" },
  }),
  "order:5:SOUQ-2026-000042:order.shipped",
);

assert.equal(
  buildNotificationDedupKey({
    userId: 3,
    type: "ad.favorited",
    entityType: "ad",
    entityId: 7,
    metadata: { actorUserId: 12 },
  }),
  "fav:3:7:12",
);

assert.equal(
  buildNotificationDedupKey({
    userId: 1,
    type: "verification.approved",
    entityType: "verification_request",
    entityId: 55,
  }),
  "verification:1:55:verification.approved",
);

const reportDedupA = buildNotificationDedupKey({
  userId: 1,
  type: "report.resolved",
  entityType: "report",
  entityId: 44,
  metadata: {
    reportId: 44,
    fromStatus: "under_review",
    toStatus: "resolved",
    reason: "لم يتم العثور على مخالفة.",
  },
});
const reportDedupB = buildNotificationDedupKey({
  userId: 1,
  type: "report.resolved",
  entityType: "report",
  entityId: 44,
  metadata: {
    reportId: 44,
    fromStatus: "under_review",
    toStatus: "resolved",
    reason: "تم تحذير المستخدم.",
  },
});
assert.ok(reportDedupA?.startsWith("report:1:44:under_review_to_resolved:"));
assert.notEqual(reportDedupA, reportDedupB);

const supportReplyA = buildNotificationDedupKey({
  userId: 1,
  type: "support.reply",
  entityType: "support_ticket",
  entityId: 9,
  metadata: { messageId: 101 },
});
const supportReplyB = buildNotificationDedupKey({
  userId: 1,
  type: "support.reply",
  entityType: "support_ticket",
  entityId: 9,
  metadata: { messageId: 102 },
});
assert.equal(supportReplyA, "support:1:9:reply:101");
assert.equal(supportReplyB, "support:1:9:reply:102");
assert.notEqual(supportReplyA, supportReplyB);

assert.ok(isValidDedupKey("msg:1:2:3"));
assert.throws(() => {
  resolveNotificationFoundation({
    userId: 1,
    type: "message.received",
    dedupKey: "bad key with spaces!!!",
  });
}, /invalid notification dedupKey/);

// --- aggregation keys ---
assert.equal(
  buildNotificationAggregationKey({
    userId: 5,
    type: "message.received",
    entityType: "conversation",
    entityId: 10,
  }),
  "agg:msg:conv:5:10",
);

assert.equal(
  buildNotificationAggregationKey({
    userId: 2,
    type: "ad.favorited",
    entityType: "ad",
    entityId: 8,
  }),
  "agg:fav:ad:2:8",
);

// --- deep links ---
assert.equal(
  notificationDeepLinkPath({ type: "message.received", entityType: "conversation", entityId: 42 }),
  "/messages/42",
);
assert.equal(
  notificationDeepLinkPath({ type: "ad.approved", entityType: "ad", entityId: 7 }),
  "/ad/7",
);
assert.equal(
  notificationDeepLinkPath({
    type: "order.shipped",
    metadata: { order_number: "SOUQ-2026-000001", role: "buyer" },
  }),
  "/orders/SOUQ-2026-000001",
);
assert.equal(
  notificationDeepLinkPath({
    type: "order.shipped",
    metadata: { order_number: "SOUQ-2026-000001", role: "seller" },
  }),
  "/seller-orders/SOUQ-2026-000001",
);
assert.equal(
  notificationDeepLinkPath({ type: "support.reply", entityType: "support_ticket", entityId: 9 }),
  "/account/help?ticket=9",
);
assert.equal(
  notificationDeepLinkPath({ type: "verification.approved", entityType: "verification_request", entityId: 3 }),
  "/account/verification/status/3",
);
assert.equal(
  notificationDeepLinkPath({
    type: "trust.restriction",
    metadata: { enforcement_id: "enf-abc" },
  }),
  "/account/trust/enforcement/enf-abc",
);
assert.equal(notificationDeepLinkPath({ type: "security.login_alert" }), "/account/security");

// --- foundation resolver ---
const f = resolveNotificationFoundation({
  userId: 10,
  type: "message.received",
  entityType: "conversation",
  entityId: 20,
  metadata: { messageId: 5 },
});
assert.equal(f.domain, "messages");
assert.equal(f.category, "messages");
assert.equal(f.priority, 1);
assert.equal(f.dedupKey, "msg:10:20:5");
assert.equal(f.aggregationKey, "agg:msg:conv:10:20");
assert.equal(f.deepLinkPath, "/messages/20");

const orderF = resolveNotificationFoundation({
  userId: 1,
  type: "order.delivered",
  metadata: { order_number: "SOUQ-2026-000099", role: "seller" },
});
assert.equal(orderF.domain, "orders");
assert.equal(orderF.dedupKey, "order:1:SOUQ-2026-000099:order.delivered");
assert.equal(orderF.deepLinkPath, "/seller-orders/SOUQ-2026-000099");

console.log("foundation.test.mjs: OK");

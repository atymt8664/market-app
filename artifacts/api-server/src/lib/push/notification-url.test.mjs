import assert from "node:assert/strict";
import { notificationDeepLinkPath } from "./notification-url";

assert.equal(
  notificationDeepLinkPath({ type: "message.received", entityType: "conversation", entityId: 42 }),
  "/messages/42",
);
assert.equal(
  notificationDeepLinkPath({ type: "ad.approved", entityType: "ad", entityId: 7 }),
  "/ad/7",
);
assert.equal(notificationDeepLinkPath({ type: "support.reply", entityType: "support", entityId: 1 }), "/account/help");
assert.equal(
  notificationDeepLinkPath({ type: "support.reply", entityType: "support_ticket", entityId: 1 }),
  "/account/help?ticket=1",
);
assert.equal(
  notificationDeepLinkPath({
    type: "order.shipped",
    metadata: { order_number: "SOUQ-2026-000010", role: "buyer" },
  }),
  "/orders/SOUQ-2026-000010",
);

console.log("notification-url.test.mjs: OK");

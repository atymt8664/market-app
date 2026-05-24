import assert from "node:assert/strict";
import { notificationDeepLinkPath } from "./notification-url.ts";

assert.equal(
  notificationDeepLinkPath({ type: "message.received", entityType: "conversation", entityId: 42 }),
  "/messages/42",
);
assert.equal(
  notificationDeepLinkPath({ type: "ad.approved", entityType: "ad", entityId: 7 }),
  "/ad/7",
);
assert.equal(notificationDeepLinkPath({ type: "support.reply", entityType: "support", entityId: 1 }), "/account/help");

console.log("notification-url.test.mjs: OK");

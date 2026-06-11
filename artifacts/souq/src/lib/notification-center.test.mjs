import assert from "node:assert/strict";
import {
  filterNotificationsByTab,
  normalizeNotificationCategory,
  resolveNotificationHref,
  visibleNotificationTabs,
} from "./notification-center";

const base = {
  id: 1,
  type: "ad.approved",
  title: "t",
  body: "b",
  entityType: "ad",
  entityId: 9,
  metadata: null,
  category: "marketplace",
  domain: "marketplace",
  priority: 1,
  deepLinkPath: "/ad/9",
  readAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(normalizeNotificationCategory(base), "marketplace");
assert.equal(normalizeNotificationCategory({ ...base, category: "", type: "order.shipped" }), "orders");

assert.equal(filterNotificationsByTab([base, { ...base, id: 2, category: "messages" }], "marketplace").length, 1);
assert.equal(filterNotificationsByTab([base, { ...base, id: 2, readAt: "x" }], "unread").length, 1);
assert.equal(
  filterNotificationsByTab([base, { ...base, id: 3, type: "message.received", category: "messages" }], "all").length,
  1,
);
assert.equal(
  filterNotificationsByTab([{ ...base, id: 4, type: "message.received" }], "messages").length,
  0,
);

const tabs = visibleNotificationTabs([
  base,
  { ...base, id: 2, category: "orders" },
  { ...base, id: 3, type: "message.received", category: "messages" },
]);
assert.ok(tabs.includes("all"));
assert.ok(tabs.includes("unread"));
assert.ok(tabs.includes("marketplace"));
assert.ok(tabs.includes("orders"));

assert.equal(resolveNotificationHref(base), "/ad/9");
assert.equal(
  resolveNotificationHref({
    ...base,
    deepLinkPath: "/notifications",
    entityType: "ad",
    entityId: 5,
  }),
  "/ad/5",
);
assert.equal(
  resolveNotificationHref({
    ...base,
    deepLinkPath: "",
    entityType: "conversation",
    entityId: 12,
  }),
  "/messages/12",
);

console.log("notification-center.test.mjs: OK");

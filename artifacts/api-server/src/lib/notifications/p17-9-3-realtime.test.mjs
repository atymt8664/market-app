import assert from "node:assert/strict";
import {
  NOTIFICATION_REALTIME_EVENT,
  buildNotificationRealtimeWsEvent,
  shouldEmitNotificationRealtime,
} from "./realtime-event";

assert.equal(NOTIFICATION_REALTIME_EVENT, "notification.created");

const row = {
  id: 42,
  userId: 7,
  type: "message.received",
  title: "New message",
  body: "Hello",
  entityType: "conversation",
  entityId: 3,
  metadata: { messageId: 99 },
  dedupKey: "msg:7:3:99",
  aggregationKey: "agg:msg:conv:7:3",
  priority: 1,
  category: "messages",
  domain: "messages",
  readAt: null,
  createdAt: new Date("2026-06-10T10:00:00.000Z"),
};

const event = buildNotificationRealtimeWsEvent(row);
assert.equal(event.type, NOTIFICATION_REALTIME_EVENT);
assert.equal(event.notification.id, 42);
assert.equal(event.notification.dedupKey, "msg:7:3:99");
assert.equal(event.notification.category, "messages");
assert.equal(event.notification.deepLinkPath, "/messages/3");

assert.equal(shouldEmitNotificationRealtime(true), true);
assert.equal(shouldEmitNotificationRealtime(false), false);

const serialized = JSON.stringify(event);
const parsed = JSON.parse(serialized);
assert.equal(parsed.type, "notification.created");
assert.equal(parsed.notification.id, 42);

console.log("p17-9-3-realtime.test.mjs: OK");

import assert from "node:assert/strict";
import { buildPushDeliveryJob } from "./build-delivery-job";
import { buildPushJobIdempotencyKey } from "./idempotency";
import {
  PUSH_PAYLOAD_VERSION,
  buildPushNotificationPayload,
  buildPushNotificationTag,
} from "./payload-contract";
import { shouldSkipPushForConnectedUser } from "./delivery-policy";

const prepared = {
  userId: 5,
  type: "message.received",
  title: "New message",
  body: "Hello",
  entityType: "conversation",
  entityId: 10,
  metadata: { messageId: 99 },
  foundation: {
    domain: "messages",
    category: "messages",
    priority: 1,
    dedupKey: "msg:5:10:99",
    aggregationKey: "agg:msg:conv:5:10",
    deepLinkPath: "/messages/10",
  },
};

const job = buildPushDeliveryJob(prepared, 42);
assert.equal(job.notificationId, 42);
assert.equal(job.dedupKey, "msg:5:10:99");
assert.equal(job.category, "messages");
assert.equal(job.deepLinkPath, "/messages/10");

assert.equal(
  buildPushJobIdempotencyKey(job),
  "push.deliver:dedup:5:msg:5:10:99",
);

const legacyJob = { ...job, dedupKey: null };
assert.equal(
  buildPushJobIdempotencyKey(legacyJob),
  "push.deliver:5:42",
);

const payload = buildPushNotificationPayload(job);
assert.equal(payload.data.v, PUSH_PAYLOAD_VERSION);
assert.equal(payload.data.url, "/messages/10");
assert.equal(payload.data.notificationId, 42);
assert.equal(payload.data.dedupKey, "msg:5:10:99");
assert.equal(payload.data.category, "messages");
assert.equal(payload.data.domain, "messages");
assert.equal(payload.data.priority, 1);

const tag = buildPushNotificationTag(payload.data);
assert.ok(tag?.startsWith("d:msg:5:10:99"));

const orderJob = buildPushDeliveryJob(
  {
    userId: 1,
    type: "order.shipped",
    title: "Shipped",
    body: "",
    entityType: null,
    entityId: null,
    metadata: { order_number: "SOUQ-2026-000001", role: "buyer" },
  },
  7,
);
assert.equal(orderJob.dedupKey, "order:1:SOUQ-2026-000001:order.shipped");
assert.equal(
  buildPushNotificationPayload(orderJob).data.url,
  "/orders/SOUQ-2026-000001",
);

assert.equal(shouldSkipPushForConnectedUser(true), false);
assert.equal(shouldSkipPushForConnectedUser(false), false);

const serialized = JSON.stringify(payload);
const roundtrip = JSON.parse(serialized);
assert.equal(roundtrip.data.dedupKey, "msg:5:10:99");

console.log("p17-9-4-push.test.mjs: OK");

import assert from "node:assert/strict";

const savedRedis = process.env.REDIS_URL;
const savedQueue = process.env.QUEUE_REDIS_URL;
delete process.env.REDIS_URL;
delete process.env.QUEUE_REDIS_URL;

const { isPushQueueAvailable, enqueuePushDeliveryJob, closePushRedisClient } = await import(
  "./push-queue.ts"
);

assert.equal(isPushQueueAvailable(), false, "queue unavailable without REDIS_URL");

const queued = await enqueuePushDeliveryJob({
  userId: 1,
  notificationId: 1,
  type: "message.received",
  title: "Test",
  body: "Body",
});
assert.equal(queued, false, "enqueue returns false when Redis is absent (inline fallback path)");

await closePushRedisClient();

if (savedRedis !== undefined) process.env.REDIS_URL = savedRedis;
else delete process.env.REDIS_URL;
if (savedQueue !== undefined) process.env.QUEUE_REDIS_URL = savedQueue;
else delete process.env.QUEUE_REDIS_URL;

console.log("push-queue.test.mjs: OK");

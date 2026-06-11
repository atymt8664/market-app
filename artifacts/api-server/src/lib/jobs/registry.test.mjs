import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  EMAIL_JOB_TYPES,
  FOUNDATION_JOB_TYPES,
  NOTIFICATION_JOB_TYPES,
  OPS_JOB_TYPES,
  ANALYTICS_JOB_TYPES,
  MEDIA_JOB_TYPES,
  PUSH_JOB_TYPES,
  REGISTERED_JOB_NAMES,
  clearJobHandlerRegistryForTests,
  listRegisteredJobHandlers,
  registerJobHandler,
  registeredJobHandlerCount,
} = await import("./registry");
const { registerFoundationJobHandlers } = await import("./handlers/foundation");
const { registerEmailJobHandlers } = await import("./handlers/email");
const { registerNotificationJobHandlers } = await import("./handlers/notification");
const { registerPushJobHandlers } = await import("./handlers/push");
const { registerOpsJobHandlers } = await import("./handlers/operations");
const { registerAnalyticsJobHandlers } = await import("./handlers/analytics");
const { registerMediaJobHandlers } = await import("./handlers/media");

clearJobHandlerRegistryForTests();
assert.equal(registeredJobHandlerCount(), 0);
assert.equal(REGISTERED_JOB_NAMES.length, 10);

registerFoundationJobHandlers();
registerEmailJobHandlers();
registerNotificationJobHandlers();
registerPushJobHandlers();
registerOpsJobHandlers();
registerAnalyticsJobHandlers();
registerMediaJobHandlers();
assert.equal(registeredJobHandlerCount(), 10);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [...REGISTERED_JOB_NAMES].sort(),
);

assert.throws(
  () =>
    registerJobHandler({
      name: MEDIA_JOB_TYPES.PURGE,
      handler: async () => {},
    }),
  /Duplicate job handler/,
);

clearJobHandlerRegistryForTests();
console.log("registry.test.mjs PASS");

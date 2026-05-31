import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  EMAIL_JOB_TYPES,
  FOUNDATION_JOB_TYPES,
  NOTIFICATION_JOB_TYPES,
  OPS_JOB_TYPES,
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

clearJobHandlerRegistryForTests();
assert.equal(registeredJobHandlerCount(), 0);
assert.equal(REGISTERED_JOB_NAMES.length, 7);

registerFoundationJobHandlers();
registerEmailJobHandlers();
registerNotificationJobHandlers();
registerPushJobHandlers();
registerOpsJobHandlers();
assert.equal(registeredJobHandlerCount(), 7);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [...REGISTERED_JOB_NAMES].sort(),
);

assert.throws(
  () =>
    registerJobHandler({
      name: OPS_JOB_TYPES.SLA_ESCALATE,
      handler: async () => {},
    }),
  /Duplicate job handler/,
);

clearJobHandlerRegistryForTests();
console.log("registry.test.mjs PASS");

import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  EMAIL_JOB_TYPES,
  FOUNDATION_JOB_TYPES,
  NOTIFICATION_JOB_TYPES,
  REGISTERED_JOB_NAMES,
  clearJobHandlerRegistryForTests,
  listRegisteredJobHandlers,
  registerJobHandler,
  registeredJobHandlerCount,
} = await import("./registry");
const { registerFoundationJobHandlers } = await import("./handlers/foundation");
const { registerEmailJobHandlers } = await import("./handlers/email");
const { registerNotificationJobHandlers } = await import("./handlers/notification");

clearJobHandlerRegistryForTests();
assert.equal(registeredJobHandlerCount(), 0);
assert.equal(REGISTERED_JOB_NAMES.length, 5);

registerFoundationJobHandlers();
assert.equal(registeredJobHandlerCount(), 2);

registerEmailJobHandlers();
assert.equal(registeredJobHandlerCount(), 4);

registerNotificationJobHandlers();
assert.equal(registeredJobHandlerCount(), 5);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [...REGISTERED_JOB_NAMES].sort(),
);

assert.throws(
  () =>
    registerJobHandler({
      name: NOTIFICATION_JOB_TYPES.IN_APP,
      handler: async () => {},
    }),
  /Duplicate job handler/,
);

clearJobHandlerRegistryForTests();
console.log("registry.test.mjs PASS");

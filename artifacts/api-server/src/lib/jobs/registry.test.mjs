import assert from "node:assert/strict";
import {
  EMAIL_JOB_TYPES,
  FOUNDATION_JOB_TYPES,
  REGISTERED_JOB_NAMES,
  clearJobHandlerRegistryForTests,
  listRegisteredJobHandlers,
  registerJobHandler,
  registeredJobHandlerCount,
} from "./registry";
import { registerFoundationJobHandlers } from "./handlers/foundation";
import { registerEmailJobHandlers } from "./handlers/email";

clearJobHandlerRegistryForTests();
assert.equal(registeredJobHandlerCount(), 0);
assert.equal(REGISTERED_JOB_NAMES.length, 4);

registerFoundationJobHandlers();
assert.equal(registeredJobHandlerCount(), 2);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [
    FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
    FOUNDATION_JOB_TYPES.SYSTEM_PING,
  ].sort(),
);

registerEmailJobHandlers();
assert.equal(registeredJobHandlerCount(), 4);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [...REGISTERED_JOB_NAMES].sort(),
);

assert.throws(
  () =>
    registerJobHandler({
      name: EMAIL_JOB_TYPES.AUTH_OTP,
      handler: async () => {},
    }),
  /Duplicate job handler/,
);

clearJobHandlerRegistryForTests();
console.log("registry.test.mjs PASS");

import assert from "node:assert/strict";
import {
  FOUNDATION_JOB_TYPES,
  REGISTERED_JOB_NAMES,
  clearJobHandlerRegistryForTests,
  listRegisteredJobHandlers,
  registerJobHandler,
  registeredJobHandlerCount,
} from "./registry";
import { registerFoundationJobHandlers } from "./handlers/foundation";

clearJobHandlerRegistryForTests();
assert.equal(registeredJobHandlerCount(), 0);

registerFoundationJobHandlers();
assert.equal(registeredJobHandlerCount(), 2);
assert.deepEqual(
  listRegisteredJobHandlers().map((h) => h.name).sort(),
  [...REGISTERED_JOB_NAMES].sort(),
);

assert.throws(
  () =>
    registerJobHandler({
      name: FOUNDATION_JOB_TYPES.SYSTEM_PING,
      handler: async () => {},
    }),
  /Duplicate job handler/,
);

clearJobHandlerRegistryForTests();
console.log("registry.test.mjs PASS");

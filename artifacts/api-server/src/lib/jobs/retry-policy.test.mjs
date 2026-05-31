import assert from "node:assert/strict";
import {
  DLQ_PROBE_RETRY_OPTIONS,
  STANDARD_RETRY_OPTIONS,
  sendOptionsForPriority,
} from "./retry-policy";

assert.equal(STANDARD_RETRY_OPTIONS.retryLimit, 5);
assert.equal(STANDARD_RETRY_OPTIONS.retryDelay, 30);
assert.equal(STANDARD_RETRY_OPTIONS.retryBackoff, true);
assert.equal(STANDARD_RETRY_OPTIONS.retryDelayMax, 3600);

assert.equal(DLQ_PROBE_RETRY_OPTIONS.retryLimit, 2);
assert.equal(DLQ_PROBE_RETRY_OPTIONS.retryDelay, 1);

assert.equal(sendOptionsForPriority("critical").priority, 0);
assert.equal(sendOptionsForPriority("high").priority, 1);
assert.equal(sendOptionsForPriority("normal").priority, 2);
assert.equal(sendOptionsForPriority("low").priority, 3);
assert.equal(sendOptionsForPriority("normal").retryLimit, 5);

console.log("retry-policy.test.mjs PASS");

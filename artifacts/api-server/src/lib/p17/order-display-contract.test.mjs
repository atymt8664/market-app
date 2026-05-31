import assert from "node:assert/strict";

/** Mirrors order-number.ts — keep in sync (no @workspace/db import in tests). */
function isOrderNumber(value) {
  return /^SOUQ-\d{4}-\d{6}$/.test(value.trim());
}

const CANONICAL = /^SOUQ-\d{4}-\d{6}$/;

assert.equal(isOrderNumber("SOUQ-2026-001001"), true);
assert.equal(CANONICAL.test("SOUQ-2026-001001"), true);
assert.equal(isOrderNumber("mock-buyer-001"), false);
assert.equal(isOrderNumber("test"), false);

console.log("order-display-contract.test.mjs: PASS");

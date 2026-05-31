import assert from "node:assert/strict";

function isOrderNumber(value) {
  return /^SOUQ-\d{4}-\d{6}$/.test(value.trim());
}

assert.equal(isOrderNumber("SOUQ-2026-000001"), true);
assert.equal(isOrderNumber("SOUQ-2026-000042"), true);
assert.equal(isOrderNumber("SOUQ-26-000001"), false);

const prefix = "SOUQ-2026-";
const fromPos = prefix.length + 1;
assert.equal(fromPos, 11);
assert.equal("SOUQ-2026-000001".substring(fromPos - 1), "000001");

console.log("order-number.test.mjs: PASS");

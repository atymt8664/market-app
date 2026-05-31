import assert from "node:assert/strict";
import {
  assertTransitionAllowed,
  getTransitionSpec,
  OrderTransitionError,
} from "./order-state-machine.ts";

const create = getTransitionSpec("create");
assert.equal(create.to, "pending_confirmation");
assert.equal(create.from, null);

const accept = assertTransitionAllowed("pending_confirmation", "accept");
assert.equal(accept.to, "confirmed");

const reject = assertTransitionAllowed("pending_confirmation", "reject");
assert.equal(reject.to, "cancelled");
assert.equal(reject.eventCode, "seller_rejected_order");

let threw = false;
try {
  assertTransitionAllowed("confirmed", "accept");
} catch (e) {
  threw = e instanceof OrderTransitionError;
}
assert.equal(threw, true);

console.log("order-state-machine.test.mjs: PASS");

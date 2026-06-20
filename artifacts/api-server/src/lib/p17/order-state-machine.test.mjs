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

const inTransit = assertTransitionAllowed("shipped", "mark_in_transit");
assert.equal(inTransit.to, "in_transit");

const delivered = assertTransitionAllowed("in_transit", "mark_delivered");
assert.equal(delivered.to, "delivered");

const confirm = assertTransitionAllowed("delivered", "confirm_receipt");
assert.equal(confirm.to, "buyer_confirmed");

const complete = getTransitionSpec("complete_order");
assert.equal(complete.from, "buyer_confirmed");
assert.equal(complete.to, "completed");

let buyerCantShip = false;
try {
  assertTransitionAllowed("shipped", "mark_delivered");
} catch (e) {
  buyerCantShip = e instanceof OrderTransitionError;
}
assert.equal(buyerCantShip, true);

console.log("order-state-machine.test.mjs: PASS");

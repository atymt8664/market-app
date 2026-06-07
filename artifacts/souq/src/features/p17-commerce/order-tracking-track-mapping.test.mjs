import assert from "node:assert/strict";
import {
  PICKUP_TRACK_STEPS,
  SHIPPING_TRACK_STEPS,
  resolveCurrentStepIndex,
  resolveTrackingTrackModel,
  trackingStepsForOrder,
} from "./order-tracking-track-mapping.ts";

assert.deepEqual(trackingStepsForOrder({ fulfillmentMode: "shipping" }), SHIPPING_TRACK_STEPS);
assert.deepEqual(trackingStepsForOrder({ fulfillmentMode: "pickup" }), PICKUP_TRACK_STEPS);
assert.equal(SHIPPING_TRACK_STEPS.length, 6);
assert.equal(PICKUP_TRACK_STEPS.length, 4);

const shippingPreparing = resolveTrackingTrackModel({
  status: "preparing",
  fulfillmentMode: "shipping",
});
assert.equal(shippingPreparing.currentIndex, 2);
assert.equal(shippingPreparing.nodeStates[2], "current");
assert.equal(shippingPreparing.nodeStates[1], "completed");
assert.equal(shippingPreparing.nodeStates[3], "future");

const shippingInTransit = resolveTrackingTrackModel({
  status: "in_transit",
  fulfillmentMode: "shipping",
});
assert.equal(shippingInTransit.currentIndex, 4);
assert.equal(shippingInTransit.nodeStates[4], "current");

const pickupDelivered = resolveTrackingTrackModel({
  status: "delivered",
  fulfillmentMode: "pickup",
});
assert.ok(pickupDelivered.nodeStates.every((s) => s === "completed"));

const cancelled = resolveTrackingTrackModel({
  status: "cancelled",
  fulfillmentMode: "shipping",
});
assert.equal(cancelled.nodeStates[0], "completed");
assert.equal(cancelled.nodeStates[1], "future");

assert.equal(resolveCurrentStepIndex("out_for_delivery", "shipping"), 4);
assert.equal(resolveCurrentStepIndex("confirmed", "pickup"), 1);

console.log("order-tracking-track-mapping.test.mjs PASS");

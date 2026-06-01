import assert from "node:assert/strict";
import { resolveCheckoutFulfillmentMode } from "./ad-fulfillment.ts";

assert.equal(resolveCheckoutFulfillmentMode({}), "pickup");
assert.equal(
  resolveCheckoutFulfillmentMode({ shipping: { ids: [], pickupOnly: true } }),
  "pickup",
);
assert.equal(
  resolveCheckoutFulfillmentMode({ v: 1, specs: {}, shipping: { ids: ["dhl"], pickupOnly: false } }),
  "shipping",
);
assert.equal(
  resolveCheckoutFulfillmentMode({ v: 1, specs: {}, shipping: { ids: ["dhl"], pickupOnly: true } }),
  "pickup",
);

console.log("ad-fulfillment.test.mjs PASS");

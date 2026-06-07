import assert from "node:assert/strict";
import { deriveFulfillmentModeFromShippingMeta } from "./ad-fulfillment-mode.ts";

// P17-7A §2.1 — no shipping metadata → pickup (safe v1)
assert.equal(deriveFulfillmentModeFromShippingMeta(undefined), "pickup");
assert.equal(deriveFulfillmentModeFromShippingMeta(null), "pickup");

// pickupOnly wins even when shipping ids exist
assert.equal(
  deriveFulfillmentModeFromShippingMeta({ ids: ["dhl"], pickupOnly: true }),
  "pickup",
);

// shipping options present and not pickup-only → shipping
assert.equal(
  deriveFulfillmentModeFromShippingMeta({ ids: ["dhl", "hermes"], pickupOnly: false }),
  "shipping",
);

// empty ids, not pickup-only → pickup (no shippable method)
assert.equal(
  deriveFulfillmentModeFromShippingMeta({ ids: [], pickupOnly: false }),
  "pickup",
);

// empty ids with pickupOnly → pickup
assert.equal(
  deriveFulfillmentModeFromShippingMeta({ ids: [], pickupOnly: true }),
  "pickup",
);

console.log("ad-fulfillment-mode.test.mjs PASS");

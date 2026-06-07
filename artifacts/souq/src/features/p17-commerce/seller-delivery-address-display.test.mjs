import assert from "node:assert/strict";
import {
  displayOrderAddressValue,
  ORDER_ADDRESS_DISPLAY_FALLBACK,
} from "./seller-delivery-address-display.ts";

assert.equal(displayOrderAddressValue("  Leipzig  "), "Leipzig");
assert.equal(displayOrderAddressValue(""), ORDER_ADDRESS_DISPLAY_FALLBACK);
assert.equal(displayOrderAddressValue(null), ORDER_ADDRESS_DISPLAY_FALLBACK);
assert.equal(displayOrderAddressValue(undefined), ORDER_ADDRESS_DISPLAY_FALLBACK);

console.log("seller-delivery-address-display.test.mjs PASS");

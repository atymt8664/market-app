import assert from "node:assert/strict";
import {
  buildInitialCheckoutAddressFromUser,
  EMPTY_CHECKOUT_ADDRESS,
  hasCheckoutAddressInput,
  maskPhoneForPreview,
  validateCheckoutAddress,
} from "./checkout-address-types.ts";

const t = (key) => key;

const valid = {
  ...EMPTY_CHECKOUT_ADDRESS,
  recipientName: "محمد أحمد",
  phone: "+4915123456789",
  countryCode: "DE",
  city: "Leipzig",
  postalCode: "04109",
  line1: "Musterstraße 12",
  line2: "Wohnung 3",
};

assert.deepEqual(validateCheckoutAddress(valid, t), {});

const missingLine2 = { ...valid, line2: "" };
assert.ok(validateCheckoutAddress(missingLine2, t).line2);

const shortName = { ...valid, recipientName: "م" };
assert.ok(validateCheckoutAddress(shortName, t).recipientName);

const longCity = { ...valid, city: "x".repeat(121) };
assert.ok(validateCheckoutAddress(longCity, t).city);

assert.equal(maskPhoneForPreview("+4915123456789"), "***6789");
assert.equal(maskPhoneForPreview("12"), "***");

const fromUser = buildInitialCheckoutAddressFromUser({
  name: " Ali ",
  phone: " +49123 ",
  city: " Berlin ",
});
assert.equal(fromUser.recipientName, "Ali");
assert.equal(fromUser.phone, "+49123");
assert.equal(fromUser.city, "Berlin");
assert.equal(fromUser.countryCode, "DE");

assert.equal(hasCheckoutAddressInput(EMPTY_CHECKOUT_ADDRESS), false);
assert.equal(hasCheckoutAddressInput({ ...EMPTY_CHECKOUT_ADDRESS, city: "x" }), true);

console.log("checkout-address-types.test.mjs PASS");

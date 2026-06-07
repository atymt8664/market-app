import assert from "node:assert/strict";
import { ShippingBuyerAddressInputSchema } from "./orders-schemas.ts";

const valid = {
  recipientName: "محمد أحمد",
  phone: "+4915123456789",
  countryCode: "DE",
  city: "Leipzig",
  postalCode: "04109",
  line1: "Musterstraße 12",
  line2: "Wohnung 3",
};

assert.ok(ShippingBuyerAddressInputSchema.safeParse(valid).success);

const missingPhone = { ...valid, phone: "123" };
assert.equal(ShippingBuyerAddressInputSchema.safeParse(missingPhone).success, false);

const missingLine2 = { ...valid, line2: "" };
assert.equal(ShippingBuyerAddressInputSchema.safeParse(missingLine2).success, false);

const missingRecipient = { ...valid, recipientName: "A" };
assert.equal(ShippingBuyerAddressInputSchema.safeParse(missingRecipient).success, false);

const missingPostal = { ...valid, postalCode: "" };
assert.equal(ShippingBuyerAddressInputSchema.safeParse(missingPostal).success, false);

const missingPostalOmitted = { ...valid };
delete missingPostalOmitted.postalCode;
assert.equal(ShippingBuyerAddressInputSchema.safeParse(missingPostalOmitted).success, false);

console.log("shipping-address-validation.test.mjs PASS");

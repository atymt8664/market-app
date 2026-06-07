#!/usr/bin/env node
/**
 * P17-7A Package 2 — Checkout address step + validation + address gate (static, no network).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const checkout = readFileSync(join(root, "src/pages/checkout.tsx"), "utf8");
if (checkout.includes('step === "address"')) ok("checkout address step");
else bad("missing address step");
if (checkout.includes("CheckoutAddressForm")) ok("CheckoutAddressForm wired");
else bad("CheckoutAddressForm missing");
if (checkout.includes("validateCheckoutAddress")) ok("validateCheckoutAddress gate");
else bad("validateCheckoutAddress missing");
if (checkout.includes("fulfillmentMode === \"shipping\"") && checkout.includes("buyerAddress:")) {
  ok("shipping POST includes buyerAddress");
} else bad("shipping POST missing buyerAddress");
if (checkout.includes("buildInitialCheckoutAddressFromUser")) ok("profile prefill reuse");
else bad("profile prefill missing");

const types = readFileSync(
  join(root, "src/features/p17-commerce/checkout-address-types.ts"),
  "utf8",
);
if (types.includes("line2.length < 1 || line2.length > 200")) ok("line2 required + max");
else bad("line2 validation incomplete");

const form = readFileSync(
  join(root, "src/features/p17-commerce/checkout-address-form.tsx"),
  "utf8",
);
for (const field of [
  "checkout-recipient-name",
  "checkout-phone",
  "checkout-country",
  "checkout-city",
  "checkout-postal",
  "checkout-line1",
  "checkout-line2",
]) {
  if (form.includes(field)) ok(`form field ${field}`);
  else bad(`missing form field ${field}`);
}

process.exit(fail ? 1 : 0);

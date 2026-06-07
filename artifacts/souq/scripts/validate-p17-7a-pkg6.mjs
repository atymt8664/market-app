#!/usr/bin/env node
/**
 * P17-7A Package 6 — Seller delivery address card (static + unit, no network).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const souqRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const card = readFileSync(
  join(souqRoot, "src/features/p17-commerce/seller-delivery-address-card.tsx"),
  "utf8",
);
const detail = readFileSync(join(souqRoot, "src/features/p17-commerce/order-detail-page.tsx"), "utf8");

for (const [needle, label] of [
  ["SellerDeliveryAddressCard", "component"],
  ["p17-seller-address-recipient", "recipient row"],
  ["p17-seller-address-phone", "phone row"],
  ["p17-seller-address-country", "country row"],
  ["p17-seller-address-city", "city row"],
  ["p17-seller-address-postal", "postal row"],
  ["p17-seller-address-street", "street row"],
  ["p17-seller-address-unit", "unit row"],
  ["p17.commerce.checkout.address_name", "name label"],
  ["p17.commerce.checkout.address_unit", "unit label"],
  ["border-primary/20", "lime accent border"],
  ["#0A0A0A", "dark surface via ORDERS_CARD_COMPACT"],
]) {
  const src = needle.startsWith("p17") || needle.includes("Seller") ? card : card + detail;
  if (src.includes(needle)) ok(`${label}`);
  else bad(`missing ${label}`);
}

if (
  detail.includes('variant === "seller"') &&
  detail.includes('order.fulfillmentMode === "shipping"') &&
  detail.includes("order.buyerAddress") &&
  detail.includes("SellerDeliveryAddressCard")
) {
  ok("seller detail gates shipping + buyerAddress");
} else {
  bad("seller detail gate incomplete");
}

const unit = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    join(souqRoot, "src/features/p17-commerce/seller-delivery-address-display.test.mjs"),
  ],
  { cwd: souqRoot, stdio: "inherit", env: process.env },
);
if (unit.status !== 0) {
  bad("seller-delivery-address-display.test.mjs");
  process.exit(unit.status ?? 1);
}

if (fail === 0) {
  console.log("\np17-7a:pkg6:validate PASS");
  process.exit(0);
}
console.log("\np17-7a:pkg6:validate FAIL");
process.exit(1);

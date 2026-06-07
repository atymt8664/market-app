#!/usr/bin/env node
/**
 * P17-7A Package 3 — static API contract validate (no DB, no network).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const schemas = readFileSync(join(apiRoot, "src/lib/p17/orders-schemas.ts"), "utf8");
const service = readFileSync(join(apiRoot, "src/lib/p17/orders-service.ts"), "utf8");
const routes = readFileSync(join(apiRoot, "src/routes/orders.ts"), "utf8");

if (schemas.includes("export const ShippingBuyerAddressInputSchema")) {
  ok("ShippingBuyerAddressInputSchema exported");
} else bad("ShippingBuyerAddressInputSchema missing");

for (const field of ["recipientName", "phone", "postalCode", "line2"]) {
  const block = schemas.slice(schemas.indexOf("ShippingBuyerAddressInputSchema"));
  if (block.includes(`${field}:`) && block.includes(".min(1)") || field === "recipientName" && block.includes(".min(2)")) {
    ok(`shipping schema requires ${field}`);
  } else if (field === "recipientName" && block.includes("recipientName: z.string().trim().min(2)")) {
    ok(`shipping schema requires ${field}`);
  } else if (["phone", "postalCode", "line2"].includes(field) && block.includes(`${field}: z.string().trim().min(1)`)) {
    ok(`shipping schema requires ${field}`);
  } else {
    bad(`shipping schema missing required ${field}`);
  }
}

if (service.includes("ShippingBuyerAddressInputSchema.safeParse(parsed.buyerAddress)")) {
  ok("createOrder validates shipping address via strict schema");
} else bad("createOrder missing ShippingBuyerAddressInputSchema validation");

if (service.includes('OrdersErrorCodes.VALIDATION, "عنوان التسليم مطلوب للشحن"')) {
  ok("shipping without address → Arabic VALIDATION error");
} else bad("missing shipping-without-address guard");

if (service.includes("phone: address.phone") && service.includes("line2: address.line2")) {
  ok("seller address mapping includes phone + line2");
} else bad("mapBuyerAddressSnapshot incomplete");

if (service.includes("buyerAddress: mapBuyerAddressSnapshot(address, role)")) {
  ok("order detail enriches buyerAddress by role");
} else bad("enrichOrderDetail missing buyerAddress mapping");

if (routes.includes('router.post("/orders"') && routes.includes("ordersService.createOrder")) {
  ok("POST /api/orders wired to ordersService");
} else bad("orders route incomplete");

const unit = spawnSync(
  process.execPath,
  ["--import", "tsx/esm", join(apiRoot, "src/lib/p17/shipping-address-validation.test.mjs")],
  { cwd: apiRoot, stdio: "inherit", env: process.env },
);
if (unit.status !== 0) {
  bad("shipping-address-validation.test.mjs");
  process.exit(unit.status ?? 1);
}

if (fail === 0) {
  console.log("\np17-7a:pkg3:validate PASS");
  process.exit(0);
}
console.log("\np17-7a:pkg3:validate FAIL");
process.exit(1);

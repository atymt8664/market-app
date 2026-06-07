#!/usr/bin/env node
/**
 * P17-7A Package 1 — Ad fulfillment derivation helper (static + unit, no network).
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

const core = readFileSync(
  join(root, "src/features/p17-commerce/ad-fulfillment-mode.ts"),
  "utf8",
);
if (core.includes("deriveFulfillmentModeFromShippingMeta")) ok("ad-fulfillment-mode.ts SSOT");
else bad("missing deriveFulfillmentModeFromShippingMeta");

const helper = readFileSync(join(root, "src/features/p17-commerce/ad-fulfillment.ts"), "utf8");
if (helper.includes("deriveFulfillmentModeFromShippingMeta")) ok("ad-fulfillment.ts delegates to SSOT");
else bad("ad-fulfillment.ts missing SSOT delegate");
if (helper.includes("parseStoredAdDetails")) ok("ad-fulfillment.ts parses ad details");
else bad("ad-fulfillment.ts missing parseStoredAdDetails");

const checkout = readFileSync(join(root, "src/pages/checkout.tsx"), "utf8");
if (checkout.includes("resolveCheckoutFulfillmentMode")) ok("checkout uses resolveCheckoutFulfillmentMode");
else bad("checkout missing fulfillment helper");

process.exit(fail ? 1 : 0);

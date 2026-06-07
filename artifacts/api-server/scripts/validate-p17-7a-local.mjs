#!/usr/bin/env node
/** P17-7A local validate — source contracts (no DB). */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const labels = readFileSync(path.join(root, "src/lib/p17/order-labels.ts"), "utf8");
if (labels.includes("تم تأكيد الطلب من البائع")) ok("buyer confirmed label");
else bad("buyer confirmed label missing");

const chat = readFileSync(
  path.join(root, "../souq/src/features/p17-commerce/use-order-chat.ts"),
  "utf8",
);
if (chat.includes("order_created_draft") && chat.includes("draft")) ok("chat draft contract");
else bad("chat draft contract");

const checkout = readFileSync(path.join(root, "../souq/src/pages/checkout.tsx"), "utf8");
if (checkout.includes("CheckoutAddressForm") && checkout.includes("fulfillmentMode: \"shipping\"")) {
  ok("checkout shipping + address");
} else bad("checkout shipping + address");

process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/**
 * P17-7A Package 5 — buyer status labels + refetch (static + unit, no network).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const souqRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(souqRoot, "..", "api-server");
let fail = 0;
const ok = (m) => console.log(`  OK  ${m}`);
const bad = (m) => {
  console.log(`  FAIL ${m}`);
  fail = 1;
};

const labels = readFileSync(join(apiRoot, "src/lib/p17/order-labels.ts"), "utf8");
if (labels.includes("بانتظار تأكيد البائع")) ok("pending_confirmation label");
else bad("pending_confirmation label");
if (labels.includes("تم تأكيد الطلب من البائع")) ok("confirmed label");
else bad("confirmed label");
if (labels.includes("resolveBuyerCancelledStatusLabel")) ok("API cancelled nuance helper");
else bad("API cancelled helper missing");

const service = readFileSync(join(apiRoot, "src/lib/p17/orders-service.ts"), "utf8");
if (service.includes("resolveBuyerCancelledStatusLabel") && service.includes('row.status === "cancelled"')) {
  ok("API detail enriches cancelled buyer label from timeline");
} else bad("API cancelled enrichment missing");

const display = readFileSync(join(souqRoot, "src/features/p17-commerce/order-status-display.ts"), "utf8");
if (display.includes("resolveBuyerStatusLabel") && display.includes("seller_rejected_order")) {
  ok("frontend buyer status resolver");
} else bad("frontend resolver missing");

const detail = readFileSync(join(souqRoot, "src/features/p17-commerce/order-detail-page.tsx"), "utf8");
if (detail.includes("resolveBuyerStatusLabel(order, timelineQuery.data?.items)")) {
  ok("buyer detail uses timeline-aware label");
} else bad("buyer detail label wiring missing");

const apiHooks = readFileSync(join(souqRoot, "src/features/p17-commerce/use-orders-api.ts"), "utf8");
if (apiHooks.includes("BUYER_DETAIL_POLL_STATUSES") && apiHooks.includes("pending_confirmation")) {
  ok("buyer detail poll statuses §4.2");
} else bad("poll statuses missing");
if (apiHooks.includes('refetchOnMount: variant === "buyer" ? "always"')) {
  ok("buyer detail refetchOnMount always");
} else bad("buyer detail refetchOnMount missing");
if (apiHooks.includes("refetchOnMount: true") && apiHooks.includes("useBuyerOrdersList")) {
  ok("buyer hub refetchOnMount");
} else bad("buyer hub refetchOnMount missing");
if (apiHooks.includes("refetchOnWindowFocus: true")) ok("refetchOnWindowFocus");
else bad("refetchOnWindowFocus missing");

for (const rel of [
  join(souqRoot, "src/features/p17-commerce/order-status-display.test.mjs"),
  join(apiRoot, "src/lib/p17/order-labels-buyer-cancel.test.mjs"),
]) {
  const unit = spawnSync(
    process.execPath,
    ["--experimental-strip-types", rel],
    { cwd: souqRoot, stdio: "inherit", env: process.env },
  );
  if (unit.status !== 0) {
    bad(rel.split(/[/\\]/).pop());
    process.exit(unit.status ?? 1);
  }
}

if (fail === 0) {
  console.log("\np17-7a:pkg5:validate PASS");
  process.exit(0);
}
console.log("\np17-7a:pkg5:validate FAIL");
process.exit(1);

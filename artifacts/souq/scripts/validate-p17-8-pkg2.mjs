#!/usr/bin/env node
/**
 * P17-8 Package 2 — tracking enrichment (ETA, events, details, carrier readiness).
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

const track = readFileSync(
  join(souqRoot, "src/features/p17-commerce/order-tracking-track.tsx"),
  "utf8",
);
const enrichment = readFileSync(
  join(souqRoot, "src/features/p17-commerce/order-tracking-enrichment.ts"),
  "utf8",
);
const carrier = readFileSync(
  join(souqRoot, "src/features/p17-commerce/order-tracking-carrier-readiness.ts"),
  "utf8",
);
const detail = readFileSync(join(souqRoot, "src/features/p17-commerce/order-detail-page.tsx"), "utf8");
const types = readFileSync(join(souqRoot, "src/features/p17-commerce/orders-api.types.ts"), "utf8");
const carrierDoc = readFileSync(
  join(souqRoot, "../../docs/architecture/P17-8-pkg2-carrier-readiness.md"),
  "utf8",
);

for (const [needle, label, src] of [
  ["p17-tracking-eta", "ETA in tracking card", track],
  ["p17-tracking-last-updated", "last updated row", track],
  ["p17-tracking-shipment-events", "shipment events list", track],
  ["p17-tracking-details", "tracking details block", track],
  ["p17-tracking-date-chips", "date chips", track],
  ["p17-tracking-carrier-link", "carrier external link slot", track],
  ["p17-tracking-copy-number", "copy tracking number", track],
  ["timelineItems", "timeline wired to track", detail],
  ["buildTrackingDateChips", "date chip builder", enrichment],
  ["buildShipmentEvents", "shipment events builder", enrichment],
  ["P17_CARRIER_CATALOG", "carrier catalog", carrier],
  ["webhookReady: false", "no webhook implementation", carrier],
  ["buildCarrierTrackingUrl", "static URL readiness", carrier],
  ["DHL Paket", "DHL Paket catalog entry", carrier],
  ["Hermes Päckchen", "Hermes catalog entry", carrier],
  ["DPD Paket", "DPD catalog entry", carrier],
  ["pickup_only", "pickup-only carrier profile", carrier],
  ["etaAt", "optional etaAt type", types],
  ["p17-journey-rail", "Package 1 rail preserved", track],
  ["p17-journey-travel-pulse", "Package 1 pulse preserved", track],
]) {
  if (src.includes(needle)) ok(label);
  else bad(`missing ${label}`);
}

if (carrierDoc.includes("P17-17") && carrierDoc.includes("webhook")) {
  ok("carrier readiness architecture doc");
} else {
  bad("carrier readiness architecture doc incomplete");
}

const locales = ["ar.json", "en.json", "de.json"];
for (const file of locales) {
  const json = readFileSync(join(souqRoot, "src/i18n/locales", file), "utf8");
  for (const key of [
    "p17.commerce.tracking.last_updated",
    "p17.commerce.tracking.eta_label",
    "p17.commerce.tracking.details_title",
    "p17.commerce.tracking.events_title",
  ]) {
    if (json.includes(`"${key}"`)) ok(`${file} ${key}`);
    else bad(`missing ${file} ${key}`);
  }
}

for (const testFile of [
  "order-tracking-carrier-readiness.test.mjs",
  "order-tracking-enrichment.test.mjs",
]) {
  const unit = spawnSync(
    process.execPath,
    ["--experimental-strip-types", join(souqRoot, "src/features/p17-commerce", testFile)],
    { cwd: souqRoot, stdio: "inherit", env: process.env },
  );
  if (unit.status !== 0) {
    bad(testFile);
    process.exit(unit.status ?? 1);
  }
}

const pkg1 = spawnSync(process.execPath, [join(souqRoot, "scripts/validate-p17-8-pkg1.mjs")], {
  cwd: souqRoot,
  stdio: "inherit",
  env: process.env,
});
if (pkg1.status !== 0) {
  bad("pkg1 regression");
  process.exit(pkg1.status ?? 1);
}

if (fail === 0) {
  console.log("\np17-8:pkg2:validate PASS");
  process.exit(0);
}
console.log("\np17-8:pkg2:validate FAIL");
process.exit(1);

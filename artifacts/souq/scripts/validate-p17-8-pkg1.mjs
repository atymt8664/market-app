#!/usr/bin/env node
/**
 * P17-8 Package 1 — OrderTrackingTrack foundation (static + unit, no network).
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
const mapping = readFileSync(
  join(souqRoot, "src/features/p17-commerce/order-tracking-track-mapping.ts"),
  "utf8",
);
const detail = readFileSync(join(souqRoot, "src/features/p17-commerce/order-detail-page.tsx"), "utf8");
const trackCss = readFileSync(
  join(souqRoot, "src/features/p17-commerce/order-tracking-track.css"),
  "utf8",
);

for (const [needle, label, src] of [
  ["OrderTrackingTrack", "component export", track],
  ['dir="rtl"', "RTL track row", track],
  ["minmax(0, 1fr)", "equal node columns", track],
  ["p17-journey-rail", "continuous journey rail", track],
  ["p17-journey-travel-pulse", "live travel pulse", track + trackCss],
  ["p17-journey-rail-active-lane", "active journey lane", track + trackCss],
  ["prefers-reduced-motion", "reduced motion guard", trackCss],
  ["p17-order-tracking-track", "track testid", track],
  ["p17-tracking-node-", "node testids", track],
  ["p17-tracking-segment-", "segment testids", track],
  ["shadow-[0_0_10px_rgba(194,235,108,0.35)]", "current node glow", track],
  ["border-primary/20", "lime accent border", track],
  ["#0A0A0A", "dark premium surface", track],
  ["SHIPPING_TRACK_STEPS", "shipping steps", mapping],
  ["PICKUP_TRACK_STEPS", "pickup steps", mapping],
  ["resolveTrackingTrackModel", "status mapping", mapping],
  ["data-state=\"completed\"", "completed node state", track],
  ["data-state=\"current\"", "current node state", track],
  ["data-state=\"future\"", "future node state", track],
]) {
  if (src.includes(needle)) ok(label);
  else bad(`missing ${label}`);
}

if (!track.includes("flex-row-reverse")) {
  ok("no double RTL reverse");
} else {
  bad("flex-row-reverse still present (RTL bug)");
}

if (mapping.includes('"placed"') && mapping.includes('"delivered"') && !mapping.includes("%")) {
  ok("six-step shipping labels without percentages");
} else {
  bad("shipping step model invalid");
}

if (!track.includes("progress") && !track.includes("percent") && !track.includes("Progress")) {
  ok("no numeric progress bar");
} else {
  bad("forbidden progress UI detected");
}

if (
  detail.includes("OrderTrackingTrack") &&
  !detail.includes("OrderDetailTimelineReady")
) {
  ok("order detail wired to OrderTrackingTrack");
} else {
  bad("order detail wiring incomplete");
}

if (detail.includes("BuyerShippingStatusCard")) {
  ok("P17-7A buyer shipping card preserved");
} else {
  bad("P17-7A buyer shipping card removed");
}

const locales = ["ar.json", "en.json", "de.json"];
for (const file of locales) {
  const json = readFileSync(join(souqRoot, "src/i18n/locales", file), "utf8");
  for (const key of [
    "p17.commerce.tracking.title",
    "p17.commerce.tracking.step_placed",
    "p17.commerce.tracking.step_delivered",
  ]) {
    if (json.includes(`"${key}"`)) ok(`${file} ${key}`);
    else bad(`missing ${file} ${key}`);
  }
}

const unit = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    join(souqRoot, "src/features/p17-commerce/order-tracking-track-mapping.test.mjs"),
  ],
  { cwd: souqRoot, stdio: "inherit", env: process.env },
);
if (unit.status !== 0) {
  bad("order-tracking-track-mapping.test.mjs");
  process.exit(unit.status ?? 1);
}

if (fail === 0) {
  console.log("\np17-8:pkg1:validate PASS");
  process.exit(0);
}
console.log("\np17-8:pkg1:validate FAIL");
process.exit(1);

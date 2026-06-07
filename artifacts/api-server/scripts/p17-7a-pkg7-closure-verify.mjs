#!/usr/bin/env node
/**
 * P17-7A Package 7 — Final integration + closure verification (STAGING only).
 * Orchestrates §11 T1–T17 coverage across pkg1–6 artifacts + P17-7 shipping regression.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/load-env.ts";
import {
  assertP17OrdersStagingOnly,
  detectSupabaseProjectRef,
} from "../src/lib/p17/orders-env-guard.ts";
import { STAGING_SUPABASE_REF } from "../src/lib/jobs/constants.ts";

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOUQ_ROOT = join(API_ROOT, "../souq");
const BASE = (process.env.TEST_API_BASE || process.env.API_BASE || "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);

let fail = 0;
const ok = (msg) => console.log(`  OK  ${msg}`);
const bad = (msg) => {
  console.log(`  FAIL ${msg}`);
  fail = 1;
};
const info = (msg) => console.log(`  ..  ${msg}`);

const COVERAGE = [
  ["T1", "Shipping checkout + address → order + buyer_addresses", "p17-7a:staging-smoke"],
  ["T2", "Shipping without address → 400", "p17-7a:staging-smoke"],
  ["T3", "Pickup — no buyer_addresses row", "p17-7a:staging-smoke"],
  ["T4", "Duplicate active order → 409", "p17-7a:staging-smoke"],
  ["T5", "Idempotency-Key → single order", "p17-7a:staging-smoke"],
  ["T6", "Confirm disabled during POST", "souq p17-7a:pkg2:validate (static)"],
  ["T7", "Seller accept → buyer label", "p17-7a:pkg5:staging-status-smoke"],
  ["T8", "Seller reject → buyer label", "p17-7a:pkg5:staging-status-smoke"],
  ["T9", "Start preparing → buyer status", "p17-7:staging-flow"],
  ["T10", "Mark shipped → buyer status + tracking", "p17-7:staging-flow"],
  ["T11", "Chat draft prefilled (no auto-send)", "souq p17-7a:pkg4:validate"],
  ["T12", "Chat back navigation (from=order)", "souq p17-7a:pkg4:validate"],
  ["T13", "Seller sees full delivery address", "p17-7a:staging-smoke + pkg6 smoke"],
  ["T14", "Cross-user access → 403", "p17-7a:staging-smoke"],
  ["T15", "Buyer cannot POST accept", "p17-7a:staging-smoke"],
  ["T16", "P17-5 pickup regression", "p17-7a:staging-smoke"],
  ["T17", "i18n:check", "souq i18n:check"],
];

function runStep(label, cmd, args, cwd = API_ROOT) {
  console.log(`\n--- ${label} ---`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32", env: process.env });
  if (r.status === 0) {
    ok(label);
    return true;
  }
  bad(`${label} (exit ${r.status ?? "signal"})`);
  return false;
}

function runPnpm(script, cwd, label) {
  return runStep(label, "pnpm", ["run", script], cwd);
}

async function main() {
  console.log("=== P17-7A Package 7 — Final closure verification ===\n");

  console.log("--- §11 scenario map ---");
  for (const [id, desc, via] of COVERAGE) {
    info(`${id}: ${desc} ← ${via}`);
  }

  console.log("\n--- Environment guard ---");
  try {
    assertP17OrdersStagingOnly();
    const ref = detectSupabaseProjectRef();
    if (ref === STAGING_SUPABASE_REF) ok(`Supabase ref = STAGING (${STAGING_SUPABASE_REF})`);
    else bad(`unexpected ref: ${ref ?? "unknown"}`);
  } catch (err) {
    bad(`env guard: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const hz = await fetch(`${BASE}/api/healthz`);
  if (hz.ok) ok(`API healthz (${BASE})`);
  else {
    bad(`API unreachable at ${BASE}`);
    process.exit(1);
  }

  console.log("\n--- API local contracts (p17-7a:validate) ---");
  runPnpm("p17-7a:validate", API_ROOT, "p17-7a:validate");

  console.log("\n--- Frontend static regression (Packages 1–6) ---");
  for (const script of [
    "p17-7a:pkg1:validate",
    "p17-7a:pkg2:validate",
    "p17-7a:pkg4:validate",
    "p17-7a:pkg5:validate",
    "p17-7a:pkg6:validate",
  ]) {
    runPnpm(script, SOUQ_ROOT, script);
  }

  runPnpm("i18n:check", SOUQ_ROOT, "i18n:check (T17)");

  console.log("\n--- STAGING API integration ---");
  runPnpm("p17-7a:staging-smoke", API_ROOT, "p17-7a:staging-smoke (T1–T5, T13–T16)");
  runPnpm("p17-7a:pkg4:staging-chat-smoke", API_ROOT, "p17-7a:pkg4:staging-chat-smoke (T11 API)");
  runPnpm("p17-7a:pkg5:staging-status-smoke", API_ROOT, "p17-7a:pkg5:staging-status-smoke (T7–T8)");
  runPnpm("p17-7a:pkg6:staging-seller-address-smoke", API_ROOT, "p17-7a:pkg6:staging-seller-address-smoke (T13 UI gate)");
  runPnpm("p17-7:staging-flow", API_ROOT, "p17-7:staging-flow (T9–T10 shipping regression)");

  console.log("\n--- Optional DOM evidence (Package 6 visual) ---");
  const fe = await fetch("http://127.0.0.1:5173/");
  if (fe.ok) {
    runPnpm("p17-7a:pkg6:visual", SOUQ_ROOT, "p17-7a:pkg6:visual");
  } else {
    info("frontend :5173 not reachable — skipping pkg6 visual (non-blocking)");
  }

  if (fail === 0) {
    console.log("\n=== P17-7A PACKAGE 7 CLOSURE: PASS ===");
    process.exit(0);
  }
  console.log("\n=== P17-7A PACKAGE 7 CLOSURE: FAIL ===");
  process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

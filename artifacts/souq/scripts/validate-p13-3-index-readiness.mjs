#!/usr/bin/env node
/**
 * P13-3-A — Index monitoring readiness (local / CI).
 * Extends P13-1 with noindex leak scan, public route matrix, canonical guards.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runP13IndexLocalChecks } from "./p13-3-index-monitor-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const errors = await runP13IndexLocalChecks({ root, fetchFn: fetch });

if (errors.length) {
  console.error("[P13-3-A Index Readiness] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  "[P13-3-A Index Readiness] PASS — robots, sitemaps, canonical, noindex matrix, Googlebot wiring OK",
);

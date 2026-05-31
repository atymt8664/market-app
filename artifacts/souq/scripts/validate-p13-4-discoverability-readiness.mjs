#!/usr/bin/env node
/**
 * P13-4 — AI discoverability + Knowledge Graph readiness (local / CI).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runP13DiscoverabilityLocalChecks } from "./p13-4-discoverability-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = runP13DiscoverabilityLocalChecks({ root });

if (errors.length) {
  console.error(
    "[P13-4 Discoverability Readiness] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  "[P13-4 Discoverability Readiness] PASS — llms.txt, robots AI rules, crawler prerender, KG JSON-LD wired",
);

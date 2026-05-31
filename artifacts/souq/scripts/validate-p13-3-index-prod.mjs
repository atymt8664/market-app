#!/usr/bin/env node
/**
 * P13-3-A — Index monitoring production verification (read-only).
 * Target: https://www.souq-arab.com — requires explicit approval to run.
 */
import { runP13IndexProdChecks, P13_ORIGIN } from "./p13-3-index-monitor-lib.mjs";

const errors = await runP13IndexProdChecks({ origin: P13_ORIGIN, fetchFn: fetch });

if (errors.length) {
  console.error("[P13-3-A Index Production] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  "[P13-3-A Index Production] PASS — index monitoring checks confirmed on production",
);

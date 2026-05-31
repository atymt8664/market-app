#!/usr/bin/env node
/**
 * P13-4-A — Bing Webmaster / Bingbot production verification.
 */
import { runP13BingProdChecks } from "./p13-4-discoverability-lib.mjs";

const errors = await runP13BingProdChecks();

if (errors.length) {
  console.error("[P13-4-A Bing Production] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P13-4-A Bing Production] PASS — Bingbot receives KG + Product JSON-LD on production");

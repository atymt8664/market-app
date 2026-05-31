#!/usr/bin/env node
/**
 * P13-4 — Production verification: AI discoverability + Knowledge Graph readiness.
 */
import { runP13DiscoverabilityProdChecks } from "./p13-4-discoverability-lib.mjs";

const errors = await runP13DiscoverabilityProdChecks();

if (errors.length) {
  console.error(
    "[P13-4 Discoverability Production] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  "[P13-4 Discoverability Production] PASS — llms.txt, robots, KG prerender, ad Product JSON-LD for AI/search crawlers",
);

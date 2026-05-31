import assert from "node:assert/strict";
import { CWV_SLO, rateWebVital } from "./vitals-rating.ts";

assert.equal(rateWebVital("LCP", CWV_SLO.LCP_MS), "good");
assert.equal(rateWebVital("LCP", CWV_SLO.LCP_MS + 1), "needs-improvement");
assert.equal(rateWebVital("LCP", 5000), "poor");
assert.equal(rateWebVital("INP", CWV_SLO.INP_MS), "good");
assert.equal(rateWebVital("INP", 201), "needs-improvement");
assert.equal(rateWebVital("CLS", CWV_SLO.CLS), "good");
assert.equal(rateWebVital("CLS", 0.11), "needs-improvement");
assert.equal(rateWebVital("CLS", 0.3), "poor");

console.log("vitals.test.mjs: ok");

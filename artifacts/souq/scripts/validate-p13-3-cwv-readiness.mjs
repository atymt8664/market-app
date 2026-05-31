#!/usr/bin/env node
/**
 * P13-3-B — CWV readiness (static wiring + API vitals unit test). CI-safe.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { createAssert } from "./p13-3-cwv-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(root, "..", "api-server");
const errors = [];
const assert = createAssert(errors);

assert(existsSync(join(root, "src/lib/web-vitals-reporting.ts")), "web-vitals-reporting.ts exists");
assert(existsSync(join(root, "src/lib/normalize-vitals-route.ts")), "normalize-vitals-route.ts exists");
  assert(existsSync(join(apiRoot, "src/lib/observability/vitals.ts")), "api vitals.ts exists");
assert(existsSync(join(apiRoot, "src/lib/observability/vitals-rating.ts")), "api vitals-rating.ts exists");
assert(existsSync(join(apiRoot, "src/lib/observability/vitals.test.mjs")), "api vitals.test.mjs exists");

const mainTsx = readFileSync(join(root, "src/main.tsx"), "utf8");
assert(mainTsx.includes("initWebVitalsReporting"), "main.tsx wires initWebVitalsReporting");
assert(mainTsx.includes("bootstrapReturningUserLocale"), "main.tsx uses bootstrapReturningUserLocale");

const reporting = readFileSync(join(root, "src/lib/web-vitals-reporting.ts"), "utf8");
assert(reporting.includes("web-vitals"), "web-vitals-reporting imports web-vitals");
assert(reporting.includes("/api/observability/vitals"), "web-vitals-reporting targets vitals API");
assert(!reporting.includes("userId"), "web-vitals-reporting: no userId");
assert(!reporting.includes("email"), "web-vitals-reporting: no email");

const observabilityRoute = readFileSync(join(apiRoot, "src/routes/observability.ts"), "utf8");
assert(observabilityRoute.includes('post("/observability/vitals"'), "API POST /observability/vitals registered");
assert(observabilityRoute.includes("vitalsLimiter"), "vitals endpoint rate-limited");

const metricsTs = readFileSync(join(apiRoot, "src/lib/observability/metrics.ts"), "utf8");
assert(metricsTs.includes("webVitals"), "observability snapshot exports webVitals");

const pkg = readFileSync(join(root, "package.json"), "utf8");
assert(pkg.includes("cwv:p13:validate"), "package.json: cwv:p13:validate script");
assert(pkg.includes("cwv:p13:prod"), "package.json: cwv:p13:prod script");

const vitalsTest = spawnSync(process.execPath, ["./src/lib/observability/vitals.test.mjs"], {
  cwd: apiRoot,
  encoding: "utf8",
});
if (vitalsTest.status !== 0) {
  errors.push(`api vitals.test.mjs: ${vitalsTest.stderr || vitalsTest.stdout || "failed"}`);
}

if (errors.length) {
  console.error("[P13-3-B CWV Readiness] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P13-3-B CWV Readiness] PASS — RUM wiring + vitals unit tests OK");

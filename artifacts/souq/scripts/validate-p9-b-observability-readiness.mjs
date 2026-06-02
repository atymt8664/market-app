/**
 * P9-B — Observability readiness (static wiring review). CI-safe. No runtime change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const souqRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(souqRoot, "../..");
const apiRoot = path.join(souqRoot, "..", "api-server");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function read(abs) {
  return fs.readFileSync(abs, "utf8");
}

// Phase B docs
assert(
  fs.existsSync(path.join(repoRoot, "docs/architecture/P09-B-home-observability.md")),
  "P09-B-home-observability.md exists",
);
assert(
  fs.existsSync(path.join(repoRoot, "docs/architecture/P09-B-home-monitoring-baseline.md")),
  "P09-B-home-monitoring-baseline.md exists",
);

// Client RUM wiring (unchanged — verify only)
assert(fs.existsSync(path.join(souqRoot, "src/lib/web-vitals-reporting.ts")), "web-vitals-reporting.ts");
assert(fs.existsSync(path.join(souqRoot, "src/lib/normalize-vitals-route.ts")), "normalize-vitals-route.ts");

const mainTsx = read(path.join(souqRoot, "src/main.tsx"));
assert(mainTsx.includes("initWebVitalsReporting"), "main.tsx wires initWebVitalsReporting");
assert(mainTsx.includes("registerProductionServiceWorker"), "main.tsx wires SW registration");

const reporting = read(path.join(souqRoot, "src/lib/web-vitals-reporting.ts"));
assert(reporting.includes("onLCP"), "reports LCP");
assert(reporting.includes("onINP"), "reports INP");
assert(reporting.includes("onCLS"), "reports CLS");
assert(reporting.includes("scheduleAfterFirstPaint"), "vitals deferred after first paint");
assert(reporting.includes("/api/observability/vitals"), "vitals POST target");

// API vitals ingest (read-only)
assert(fs.existsSync(path.join(apiRoot, "src/routes/observability.ts")), "API observability route");
const obsRoute = read(path.join(apiRoot, "src/routes/observability.ts"));
assert(obsRoute.includes('post("/observability/vitals"'), "POST /observability/vitals");
assert(obsRoute.includes("vitalsLimiter"), "rate limited");

// Package scripts
const pkg = read(path.join(souqRoot, "package.json"));
assert(pkg.includes("p9-b:guards"), "package.json: p9-b:guards");
assert(pkg.includes("p9-b:visual"), "package.json: p9-b:visual");
assert(pkg.includes("test:home-stability"), "package.json: test:home-stability");

// Existing P13 CWV readiness still passes
const cwv = spawnSync("pnpm", ["--filter", "@workspace/souq", "run", "cwv:p13:readiness"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: true,
});
if (cwv.status !== 0) {
  errors.push(`cwv:p13:readiness failed: ${cwv.stderr || cwv.stdout || "unknown"}`);
}

const report = {
  phase: "P9-B",
  kind: "observability-readiness",
  pass: errors.length === 0,
  errors,
  notes: [
    "No client runtime changes in Phase B",
    "RUM uses existing P13-3-B wiring",
    "Home stability FAIL/WARN thresholds: P09-B-home-monitoring-baseline.md",
  ],
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

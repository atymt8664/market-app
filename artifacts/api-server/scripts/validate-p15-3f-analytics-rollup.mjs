#!/usr/bin/env node
/**
 * P15-3F — Static validation for analytics rollup (no DB, no secrets).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function bad(msg) {
  console.error(`  FAIL ${msg}`);
  errors.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

console.log("=== P15-3F analytics rollup validate ===");

const required = [
  "src/lib/admin-analytics-compute.ts",
  "src/lib/admin-analytics-rollup-store.ts",
  "src/lib/analytics-rollup.ts",
  "src/lib/jobs/handlers/analytics.ts",
  "src/lib/jobs/analytics-types.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("analytics.daily")
  ? ok("analytics.daily registry")
  : bad("analytics.daily missing");

const rollup = read("src/lib/analytics-rollup.ts");
rollup.includes("isAnalyticsRollupEnabled") &&
rollup.includes("resolveAdminAnalytics")
  ? ok("STAGING analytics rollup gate + resolver")
  : bad("analytics rollup gate missing");

const scheduler = read("src/lib/jobs/scheduler.ts");
scheduler.includes("registerAnalyticsSchedules") &&
scheduler.includes("analytics.daily")
  ? ok("analytics daily cron registration")
  : bad("analytics scheduler missing");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerAnalyticsJobHandlers")
  ? ok("worker registers analytics handler")
  : bad("worker bootstrap incomplete");

const admin = read("src/routes/admin.ts");
admin.includes("resolveAdminAnalytics") &&
!admin.includes("computeAdminAnalyticsPayload")
  ? ok("admin routes use rollup resolver")
  : bad("admin.ts still uses inline analytics compute");

const handler = read("src/lib/jobs/handlers/analytics.ts");
handler.includes("computeAllAdminAnalyticsRollups") &&
handler.includes("upsertAllAdminAnalyticsRollups")
  ? ok("analytics handler writes rollups")
  : bad("analytics handler incomplete");

const dlq = read("src/lib/jobs/dlq.ts");
dlq.includes("ANALYTICS_JOB_TYPES.DAILY") && dlq.includes("deadLetter")
  ? ok("analytics queue DLQ wired")
  : bad("analytics DLQ missing");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3F VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3F VALIDATE: PASS ===");

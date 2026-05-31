#!/usr/bin/env node
/**
 * P15-2 — Static validation for queue foundation (no DB, no secrets).
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

console.log("=== P15-2 queue foundation validate ===");

const required = [
  "src/lib/jobs/constants.ts",
  "src/lib/jobs/env-guard.ts",
  "src/lib/jobs/retry-policy.ts",
  "src/lib/jobs/registry.ts",
  "src/lib/jobs/dlq.ts",
  "src/lib/jobs/queue-module.ts",
  "src/lib/jobs/enqueue.ts",
  "src/lib/jobs/observability.ts",
  "src/lib/jobs/worker-bootstrap.ts",
  "src/lib/jobs/handlers/foundation.ts",
  "src/lib/jobs/index.ts",
  "src/job-worker.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const pkg = JSON.parse(read("package.json"));
pkg.dependencies?.["pg-boss"]
  ? ok("pg-boss dependency")
  : bad("pg-boss dependency missing");
pkg.scripts?.["start:job-worker"]
  ? ok("start:job-worker script")
  : bad("start:job-worker script missing");

const build = read("build.mjs");
build.includes("job-worker.ts") ? ok("build includes job-worker") : bad("build missing job-worker");

const index = read("src/index.ts");
index.includes("jobs") && bad("API index must not import jobs (no behavior change)");
!index.includes("jobs") ? ok("API index unchanged (no job wiring)") : null;

const pkgLockGuard = read("package.json");
["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  JSON.stringify(pkg).includes(dep)
    ? bad(`forbidden queue dep present: ${dep}`)
    : ok(`no ${dep}`);
});

const envGuard = read("src/lib/jobs/env-guard.ts");
envGuard.includes("PRODUCTION_SUPABASE_REF") && envGuard.includes("JOB_QUEUE_PRODUCTION_ALLOWED")
  ? ok("production ref guard")
  : bad("production ref guard missing");

const retry = read("src/lib/jobs/retry-policy.ts");
retry.includes("retryLimit: 5") ? ok("standard retry policy") : bad("retry policy");

const registry = read("src/lib/jobs/registry.ts");
registry.includes("system.ping") && registry.includes("system.dlq_probe")
  ? ok("foundation job registry")
  : bad("foundation jobs missing");

if (errors.length) {
  console.error(`\n=== P15-2 VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-2 VALIDATE: PASS ===");

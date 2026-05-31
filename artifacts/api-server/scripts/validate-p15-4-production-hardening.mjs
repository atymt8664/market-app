#!/usr/bin/env node
/**
 * P15-4 — Static validation for production hardening (no DB, no secrets).
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

console.log("=== P15-4 production hardening validate ===");

const analysisDoc = path.resolve(
  root,
  "../../docs/architecture/P15-4-production-hardening.md",
);
fs.existsSync(analysisDoc)
  ? ok("P15-4 architecture document present")
  : bad("missing docs/architecture/P15-4-production-hardening.md");

const runbook = path.resolve(
  root,
  "../../docs/runbooks/P15-4-worker-operations.md",
);
fs.existsSync(runbook)
  ? ok("P15-4 worker operations runbook present")
  : bad("missing docs/runbooks/P15-4-worker-operations.md");

const required = [
  "src/lib/jobs/dlq-replay.ts",
  "src/lib/jobs/job-queue-probe.ts",
  "src/routes/admin-jobs.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const enqueue = read("src/lib/jobs/enqueue.ts");
enqueue.includes("jobName") ? ok("envelope includes jobName for DLQ replay") : bad("jobName missing from enqueue");

const dlqReplay = read("src/lib/jobs/dlq-replay.ts");
dlqReplay.includes("replayDeadLetterJob") && dlqReplay.includes("listDlqJobsForOps")
  ? ok("DLQ replay foundation")
  : bad("dlq-replay incomplete");

const dlq = read("src/lib/jobs/dlq.ts");
dlq.includes("queued: true") && dlq.includes("listDeadLetterJobs")
  ? ok("DLQ listing uses queued jobs (not failed-only filter)")
  : bad("DLQ listing fix missing");

const infra = read("src/lib/admin-infrastructure-health.ts");
infra.includes("probePgBossJobQueue") && infra.includes("dlqDepth")
  ? ok("queueWorker probes pg-boss (not Redis proxy)")
  : bad("infrastructure health pg-boss probe missing");

const monitoring = read("src/lib/admin-monitoring-snapshot.ts");
monitoring.includes("pgBoss") && monitoring.includes("pg_boss_queue")
  ? ok("admin monitoring pg-boss metrics + alerts")
  : bad("monitoring snapshot missing pg-boss");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerProcessGuards") && worker.includes("unhandledRejection")
  ? ok("worker lifecycle guards")
  : bad("worker bootstrap guards missing");

const adminJobs = read("src/routes/admin-jobs.ts");
adminJobs.includes("assertJobQueueStagingOnly") &&
adminJobs.includes("/admin/jobs/dlq") &&
adminJobs.includes("replay")
  ? ok("admin DLQ ops routes (STAGING gate)")
  : bad("admin jobs routes incomplete");

const docker = path.resolve(
  root,
  "../../infra/hetzner/phase6/docker-compose.job-worker-staging.yml",
);
fs.existsSync(docker)
  ? ok("STAGING job-worker docker-compose reference")
  : bad("missing docker-compose.job-worker-staging.yml");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-4 VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-4 VALIDATE: PASS ===");

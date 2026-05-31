#!/usr/bin/env node
/**
 * P15-3E — Static validation for ops cron / SLA escalation (no DB, no secrets).
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

console.log("=== P15-3E ops cron validate ===");

const required = [
  "src/lib/ops-cron.ts",
  "src/lib/jobs/ops-types.ts",
  "src/lib/jobs/handlers/operations.ts",
  "src/lib/jobs/scheduler.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("ops.sla_escalate")
  ? ok("ops.sla_escalate registry")
  : bad("ops.sla_escalate missing");

const opsCron = read("src/lib/ops-cron.ts");
opsCron.includes("isOpsCronEnabled") &&
opsCron.includes("ensureSlaEscalationBeforeAdminRead")
  ? ok("STAGING ops cron gate + admin read guard")
  : bad("ops cron gate missing");

const scheduler = read("src/lib/jobs/scheduler.ts");
scheduler.includes("registerOpsSchedules") &&
scheduler.includes("boss.schedule")
  ? ok("pg-boss schedule registration")
  : bad("scheduler missing");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerOpsJobHandlers") &&
worker.includes("bootstrapJobSchedules")
  ? ok("worker registers ops handler + schedules")
  : bad("worker bootstrap incomplete");

const handler = read("src/lib/jobs/handlers/operations.ts");
handler.includes("runAutoEscalationAll")
  ? ok("ops handler calls runAutoEscalationAll")
  : bad("handler missing escalation core");

const adminOps = read("src/routes/admin-operations.ts");
adminOps.includes("ensureSlaEscalationBeforeAdminRead") &&
!adminOps.includes("runAutoEscalationAll")
  ? ok("admin-operations uses cron guard (no direct escalation)")
  : bad("admin-operations still calls runAutoEscalationAll");

const monitoring = read("src/lib/admin-monitoring-snapshot.ts");
monitoring.includes("ensureSlaEscalationBeforeAdminRead") &&
!monitoring.includes("runAutoEscalationAll")
  ? ok("monitoring snapshot uses cron guard")
  : bad("monitoring still calls runAutoEscalationAll");

const dlq = read("src/lib/jobs/dlq.ts");
dlq.includes("OPS_JOB_TYPES.SLA_ESCALATE") && dlq.includes("deadLetter")
  ? ok("ops queue DLQ wired")
  : bad("ops DLQ missing");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3E VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3E VALIDATE: PASS ===");

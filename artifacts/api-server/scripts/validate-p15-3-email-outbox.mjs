#!/usr/bin/env node
/**
 * P15-3 — Static validation for email outbox migration (no DB, no secrets).
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

console.log("=== P15-3 email outbox validate ===");

const required = [
  "src/lib/email-send.ts",
  "src/lib/email-outbox.ts",
  "src/lib/email-templates.ts",
  "src/lib/jobs/email-types.ts",
  "src/lib/jobs/handlers/email.ts",
  "src/lib/jobs/job-queue-metrics.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("auth.otp") && registry.includes("auth.reset")
  ? ok("email job registry")
  : bad("email jobs missing from registry");

const outbox = read("src/lib/email-outbox.ts");
outbox.includes("isEmailOutboxEnabled") && outbox.includes("STAGING_SUPABASE_REF")
  ? ok("STAGING-only outbox gate")
  : bad("STAGING outbox gate missing");

const auth = read("src/routes/auth.ts");
auth.includes("dispatchVerificationCodeEmail") &&
auth.includes("dispatchPasswordResetEmail")
  ? ok("auth routes use email outbox dispatch")
  : bad("auth routes not wired to outbox");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerEmailJobHandlers")
  ? ok("worker registers email handlers")
  : bad("email handlers not in worker bootstrap");

const index = read("src/index.ts");
index.includes("email-outbox") || index.includes("jobs")
  ? bad("API index must not import email-outbox directly (lazy producer)")
  : ok("API index unchanged (lazy queue producer)");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3 VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3 VALIDATE: PASS ===");

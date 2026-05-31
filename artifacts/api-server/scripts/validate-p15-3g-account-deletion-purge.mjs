#!/usr/bin/env node
/**
 * P15-3G — Static validation for account deletion storage purge (no DB, no secrets).
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

console.log("=== P15-3G account deletion purge validate ===");

const analysisDoc = path.resolve(
  root,
  "../../docs/architecture/P15-3G-account-deletion-purge.md",
);
fs.existsSync(analysisDoc)
  ? ok("P15-3G analysis document present")
  : bad("missing docs/architecture/P15-3G-account-deletion-purge.md");

const required = [
  "src/lib/purge-outbox.ts",
  "src/lib/jobs/handlers/media.ts",
  "src/lib/jobs/media-types.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("media.purge") && registry.includes("MEDIA_JOB_TYPES")
  ? ok("media.purge registry")
  : bad("media.purge missing from registry");

const purgeOutbox = read("src/lib/purge-outbox.ts");
purgeOutbox.includes("isPurgeOutboxEnabled") &&
purgeOutbox.includes("routeAccountDeletionStoragePurge") &&
purgeOutbox.includes("sync fallback")
  ? ok("STAGING purge outbox gate + sync fallback")
  : bad("purge outbox gate incomplete");

const account = read("src/routes/account.ts");
account.includes("routeAccountDeletionStoragePurge") &&
!account.includes("runBestEffortStorageCleanupForUser")
  ? ok("account delete routes storage purge via outbox")
  : bad("account.ts purge routing incomplete");

const accountDeletion = read("src/lib/account-deletion.ts");
accountDeletion.includes("executeAccountStoragePurge") &&
accountDeletion.includes("verification_request_documents")
  ? ok("path collection includes verification docs + shared purge executor")
  : bad("account-deletion.ts purge path collection incomplete");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerMediaJobHandlers")
  ? ok("worker registers media purge handler")
  : bad("worker bootstrap incomplete");

const handler = read("src/lib/jobs/handlers/media.ts");
handler.includes("executeAccountStoragePurge") &&
handler.includes("dryRun")
  ? ok("media purge handler with dry run smoke support")
  : bad("media handler incomplete");

const dlq = read("src/lib/jobs/dlq.ts");
dlq.includes("MEDIA_JOB_TYPES.PURGE") && dlq.includes("deadLetter")
  ? ok("media.purge queue DLQ wired")
  : bad("media purge DLQ missing");

const scheduler = read("src/lib/jobs/scheduler.ts");
scheduler.includes("media.purge")
  ? bad("media.purge must NOT be cron-scheduled (event-driven only)")
  : ok("no cron scheduler for media.purge (correct)");

const observability = read("src/lib/jobs/observability.ts");
observability.includes("mediaMetrics")
  ? ok("queue health includes mediaMetrics")
  : bad("mediaMetrics missing from observability");

registry.includes("media.normalize")
  ? bad("media.normalize must NOT be registered in P15-3G")
  : ok("media.normalize not registered (upload sync preserved)");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3G VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3G VALIDATE: PASS ===");

#!/usr/bin/env node
/**
 * P15-3B — Static validation for notification outbox (no DB, no secrets).
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

console.log("=== P15-3B notification outbox validate ===");

const required = [
  "src/lib/notification-persist.ts",
  "src/lib/notification-prepare.ts",
  "src/lib/notification-outbox.ts",
  "src/lib/jobs/notification-types.ts",
  "src/lib/jobs/handlers/notification.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("notify.in_app") ? ok("notify.in_app registry") : bad("notify.in_app missing");

const outbox = read("src/lib/notification-outbox.ts");
outbox.includes("isNotificationOutboxEnabled") &&
outbox.includes("STAGING_SUPABASE_REF")
  ? ok("STAGING-only notification outbox gate")
  : bad("STAGING gate missing");

const create = read("src/lib/create-notification.ts");
create.includes("isNotificationOutboxEnabled") &&
create.includes("dispatchInAppNotification") &&
create.includes("executeInsertInAppNotification")
  ? ok("createNotification outbox routing")
  : bad("createNotification not wired");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerNotificationJobHandlers")
  ? ok("worker registers notification handler")
  : bad("notification handler missing in worker");

const persist = read("src/lib/notification-persist.ts");
persist.includes("routePushDeliveryAfterNotification")
  ? ok("notification-persist routes push delivery")
  : bad("notification-persist push routing missing");

const schedule = read("src/lib/push/schedule-push-delivery.ts");
schedule.includes("schedulePushDelivery")
  ? ok("legacy schedulePushDelivery preserved for PRODUCTION")
  : bad("schedulePushDelivery missing");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3B VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3B VALIDATE: PASS ===");

#!/usr/bin/env node
/**
 * P15-3C — Static validation for push delivery outbox (no DB, no secrets).
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

console.log("=== P15-3C push delivery outbox validate ===");

const required = [
  "src/lib/push-outbox.ts",
  "src/lib/jobs/push-types.ts",
  "src/lib/jobs/handlers/push.ts",
];

for (const f of required) {
  exists(f) ? ok(`file ${f}`) : bad(`missing ${f}`);
}

const registry = read("src/lib/jobs/registry.ts");
registry.includes("push.deliver") ? ok("push.deliver registry") : bad("push.deliver missing");

const outbox = read("src/lib/push-outbox.ts");
outbox.includes("isPushOutboxEnabled") && outbox.includes("routePushDeliveryAfterNotification")
  ? ok("STAGING push outbox gate + router")
  : bad("push outbox gate missing");

const persist = read("src/lib/notification-persist.ts");
persist.includes("routePushDeliveryAfterNotification") &&
!persist.includes("schedulePushDelivery(")
  ? ok("notification-persist routes push via outbox")
  : bad("notification-persist still calls schedulePushDelivery directly");

const schedule = read("src/lib/push/schedule-push-delivery.ts");
schedule.includes("executePushDelivery")
  ? ok("executePushDelivery extracted")
  : bad("executePushDelivery missing");

const worker = read("src/lib/jobs/worker-bootstrap.ts");
worker.includes("registerPushJobHandlers")
  ? ok("worker registers push handler")
  : bad("push handler missing in worker");

const handler = read("src/lib/jobs/handlers/push.ts");
handler.includes("executePushDelivery")
  ? ok("push handler calls executePushDelivery")
  : bad("handler missing executePushDelivery");

["bullmq", "amqplib", "sqs-consumer"].forEach((dep) => {
  read("package.json").includes(`"${dep}"`)
    ? bad(`forbidden queue dep: ${dep}`)
    : ok(`no ${dep}`);
});

if (errors.length) {
  console.error(`\n=== P15-3C VALIDATE: FAIL (${errors.length}) ===`);
  process.exit(1);
}
console.log("\n=== P15-3C VALIDATE: PASS ===");

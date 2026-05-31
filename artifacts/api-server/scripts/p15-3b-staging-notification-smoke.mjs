#!/usr/bin/env node
/**
 * P15-3B — STAGING in-app notification outbox smoke (dry run, no DB insert).
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { NOTIFICATION_JOB_TYPES } from "../src/lib/jobs/registry";
import { enqueueInAppNotification } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import { readNotificationJobMetrics } from "../src/lib/jobs/job-queue-metrics";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.NOTIFICATION_OUTBOX_ENABLED) {
  process.env.NOTIFICATION_OUTBOX_ENABLED = "1";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJobState(boss, queueName, jobId, expectedState, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await boss.getJobById(queueName, jobId);
    if (job?.state === expectedState) return job;
    await sleep(500);
  }
  throw new Error(
    `timeout waiting for job ${queueName}/${jobId} state=${expectedState}`,
  );
}

console.log("=== P15-3B STAGING notification outbox smoke ===");

try {
  assertJobQueueStagingOnly();
} catch (err) {
  console.error("  FAIL env guard:", err instanceof Error ? err.message : err);
  process.exit(1);
}

let runtime;
try {
  runtime = await bootstrapJobWorker();
  const boss = runtime.boss;

  const health = await collectQueueHealthSnapshot(boss);
  const notifyQueue = health.queues.find((q) => q.name === "notify.in_app");
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} notify.in_app=${notifyQueue ? "present" : "missing"}`,
  );
  if (!notifyQueue) throw new Error("notify.in_app queue missing");

  const jobId = await enqueueInAppNotification(
    boss,
    {
      userId: 1,
      type: "message.received",
      title: "P15-3B smoke",
      body: "dry run",
      entityType: "conversation",
      entityId: 999001,
      metadata: { smoke: true },
      dryRun: true,
    },
    { idempotencyKey: `p15-3b-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue notify.in_app returned null");
  console.log(`  OK  enqueued notify.in_app id=${jobId}`);

  await waitForJobState(
    boss,
    NOTIFICATION_JOB_TYPES.IN_APP,
    jobId,
    "completed",
    30_000,
  );
  console.log("  OK  notify.in_app completed (dry run)");

  const metrics = readNotificationJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed >= 1, got ${metrics.processed}`);
  }
  console.log(
    `  OK  notification metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed}`,
  );

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3B STAGING NOTIFICATION SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  console.error("\n=== P15-3B STAGING NOTIFICATION SMOKE: FAIL ===");
  process.exit(1);
}

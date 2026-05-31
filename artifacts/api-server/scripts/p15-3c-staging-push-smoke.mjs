#!/usr/bin/env node
/**
 * P15-3C — STAGING push delivery outbox smoke (dry run).
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { PUSH_JOB_TYPES } from "../src/lib/jobs/registry";
import { enqueuePushDeliver } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import { readPushJobMetrics } from "../src/lib/jobs/job-queue-metrics";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.PUSH_OUTBOX_ENABLED) {
  process.env.PUSH_OUTBOX_ENABLED = "1";
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

console.log("=== P15-3C STAGING push delivery smoke ===");

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
  const pushQueue = health.queues.find((q) => q.name === "push.deliver");
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} push.deliver=${pushQueue ? "present" : "missing"}`,
  );
  if (!pushQueue) throw new Error("push.deliver queue missing");

  const jobId = await enqueuePushDeliver(
    boss,
    {
      userId: 1,
      notificationId: 999002,
      type: "message.received",
      title: "P15-3C smoke",
      body: "dry run",
      entityType: "conversation",
      entityId: 42,
      metadata: { smoke: true },
      dryRun: true,
    },
    { idempotencyKey: `p15-3c-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue push.deliver returned null");
  console.log(`  OK  enqueued push.deliver id=${jobId}`);

  await waitForJobState(
    boss,
    PUSH_JOB_TYPES.DELIVER,
    jobId,
    "completed",
    30_000,
  );
  console.log("  OK  push.deliver completed (dry run)");

  const metrics = readPushJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed >= 1, got ${metrics.processed}`);
  }
  console.log(
    `  OK  push metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed}`,
  );

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3C STAGING PUSH SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  console.error("\n=== P15-3C STAGING PUSH SMOKE: FAIL ===");
  process.exit(1);
}

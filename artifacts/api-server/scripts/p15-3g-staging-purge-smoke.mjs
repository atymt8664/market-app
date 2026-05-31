#!/usr/bin/env node
/**
 * P15-3G — STAGING media.purge smoke (dry run — no storage deletes).
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { MEDIA_JOB_TYPES } from "../src/lib/jobs/registry";
import { enqueueMediaPurge } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import {
  incrementMediaJobMetric,
  readMediaJobMetrics,
  readLastMediaPurge,
} from "../src/lib/jobs/job-queue-metrics";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.PURGE_OUTBOX_ENABLED) {
  process.env.PURGE_OUTBOX_ENABLED = "1";
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

console.log("=== P15-3G STAGING media purge smoke ===");

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
  const purgeQueue = health.queues.find((q) => q.name === "media.purge");
  if (!purgeQueue) throw new Error("media.purge queue missing");
  if (!health.mediaMetrics) throw new Error("mediaMetrics missing from health snapshot");
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} media.purge=present`,
  );

  incrementMediaJobMetric("enqueued");
  const jobId = await enqueueMediaPurge(
    boss,
    {
      userId: 1,
      paths: ["ads/1/smoke-test.jpg"],
      trigger: "smoke",
      dryRun: true,
    },
    { idempotencyKey: `p15-3g-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue media.purge returned null");
  console.log(`  OK  enqueued media.purge id=${jobId}`);

  await waitForJobState(
    boss,
    MEDIA_JOB_TYPES.PURGE,
    jobId,
    "completed",
    60_000,
  );
  console.log("  OK  media.purge completed (dry run)");

  const metrics = readMediaJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed >= 1, got ${metrics.processed}`);
  }
  const lastPurge = readLastMediaPurge();
  if (!lastPurge.at || !lastPurge.result) {
    throw new Error("last media purge metadata missing");
  }
  console.log(
    `  OK  media metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed} paths=${lastPurge.result.pathsRemoved}`,
  );

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3G STAGING MEDIA PURGE SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  process.exit(1);
}

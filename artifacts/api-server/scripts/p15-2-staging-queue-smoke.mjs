#!/usr/bin/env node
/**
 * P15-2 — STAGING integrated smoke (requires STAGING DATABASE_URL + JOB_QUEUE_ENABLED=1).
 * Starts worker, enqueues foundation jobs, verifies completion/failure, graceful shutdown.
 * No secrets logged.
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import {
  enqueueDlqProbe,
  enqueueFoundationPing,
} from "../src/lib/jobs/enqueue";
import { FOUNDATION_JOB_TYPES } from "../src/lib/jobs/registry";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
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

console.log("=== P15-2 STAGING queue smoke (integrated) ===");

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

  const healthBefore = await collectQueueHealthSnapshot(boss);
  console.log(
    `  OK  queue installed schemaVersion=${healthBefore.schemaVersion} stagingOnly=${healthBefore.stagingOnly}`,
  );

  const pingId = await enqueueFoundationPing(boss, {
    smoke: true,
    at: new Date().toISOString(),
  });
  if (!pingId) throw new Error("enqueue system.ping returned null");
  console.log(`  OK  enqueued system.ping id=${pingId}`);

  await waitForJobState(
    boss,
    FOUNDATION_JOB_TYPES.SYSTEM_PING,
    pingId,
    "completed",
    30_000,
  );
  console.log("  OK  system.ping completed");

  const dlqId = await enqueueDlqProbe(boss, { smoke: true });
  if (!dlqId) throw new Error("enqueue system.dlq_probe returned null");
  console.log(`  OK  enqueued system.dlq_probe id=${dlqId}`);

  await waitForJobState(
    boss,
    FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
    dlqId,
    "failed",
    30_000,
  );
  console.log("  OK  system.dlq_probe reached failed (retry/DLQ path)");

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-2 STAGING SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  console.error("\n=== P15-2 STAGING SMOKE: FAIL ===");
  process.exit(1);
}

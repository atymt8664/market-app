#!/usr/bin/env node
/**
 * P15-3 — STAGING email outbox integrated smoke.
 * Requires STAGING DATABASE_URL + JOB_QUEUE_ENABLED=1 + EMAIL_OUTBOX_ENABLED=1.
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { EMAIL_JOB_TYPES } from "../src/lib/jobs/registry";
import { enqueueAuthOtpEmail } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import { readEmailJobMetrics } from "../src/lib/jobs/job-queue-metrics";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.EMAIL_OUTBOX_ENABLED) {
  process.env.EMAIL_OUTBOX_ENABLED = "1";
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

console.log("=== P15-3 STAGING email outbox smoke ===");

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
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} emailQueues=${health.queues.filter((q) => q.name.startsWith("auth.")).length}`,
  );

  const jobId = await enqueueAuthOtpEmail(
    boss,
    { to: "smoke@staging.local", code: "123456", dryRun: true },
    { idempotencyKey: `p15-3-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue auth.otp returned null");
  console.log(`  OK  enqueued auth.otp id=${jobId}`);

  await waitForJobState(boss, EMAIL_JOB_TYPES.AUTH_OTP, jobId, "completed", 30_000);
  console.log("  OK  auth.otp completed (dry run)");

  const metrics = readEmailJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed metric >= 1, got ${metrics.processed}`);
  }
  console.log(
    `  OK  email metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed}`,
  );

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3 STAGING EMAIL SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  console.error("\n=== P15-3 STAGING EMAIL SMOKE: FAIL ===");
  process.exit(1);
}

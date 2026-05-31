#!/usr/bin/env node
/**
 * P15-3E — STAGING ops cron smoke (manual enqueue + schedule registration).
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { OPS_JOB_TYPES } from "../src/lib/jobs/registry";
import { OPS_SLA_ESCALATE_SCHEDULE_KEY } from "../src/lib/jobs/scheduler";
import { enqueueOpsSlaEscalate } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import {
  incrementOpsJobMetric,
  readOpsJobMetrics,
  readLastOpsSlaEscalation,
} from "../src/lib/jobs/job-queue-metrics";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.OPS_CRON_ENABLED) {
  process.env.OPS_CRON_ENABLED = "1";
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

console.log("=== P15-3E STAGING ops cron smoke ===");

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

  const schedules = await boss.getSchedules(
    OPS_JOB_TYPES.SLA_ESCALATE,
    OPS_SLA_ESCALATE_SCHEDULE_KEY,
  );
  if (!schedules.length) {
    throw new Error("ops.sla_escalate schedule not registered");
  }
  console.log(
    `  OK  schedule registered cron=${schedules[0]?.cron ?? "?"} key=${schedules[0]?.key ?? "?"}`,
  );

  const health = await collectQueueHealthSnapshot(boss);
  const opsQueue = health.queues.find((q) => q.name === "ops.sla_escalate");
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} ops.sla_escalate=${opsQueue ? "present" : "missing"}`,
  );
  if (!opsQueue) throw new Error("ops.sla_escalate queue missing");
  if (!health.opsMetrics) throw new Error("opsMetrics missing from health snapshot");

  incrementOpsJobMetric("enqueued");
  const jobId = await enqueueOpsSlaEscalate(
    boss,
    { trigger: "smoke", dryRun: true },
    { idempotencyKey: `p15-3e-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue ops.sla_escalate returned null");
  console.log(`  OK  enqueued ops.sla_escalate id=${jobId}`);

  await waitForJobState(
    boss,
    OPS_JOB_TYPES.SLA_ESCALATE,
    jobId,
    "completed",
    30_000,
  );
  console.log("  OK  ops.sla_escalate completed (dry run)");

  const metrics = readOpsJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed >= 1, got ${metrics.processed}`);
  }
  const lastRun = readLastOpsSlaEscalation();
  if (!lastRun.at) {
    throw new Error("last SLA escalation timestamp missing");
  }
  console.log(
    `  OK  ops metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed} lastAt=${lastRun.at}`,
  );

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3E STAGING OPS CRON SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  process.exit(1);
}

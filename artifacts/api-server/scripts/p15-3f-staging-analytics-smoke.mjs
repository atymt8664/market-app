#!/usr/bin/env node
/**
 * P15-3F — STAGING analytics daily rollup smoke.
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { ANALYTICS_JOB_TYPES } from "../src/lib/jobs/registry";
import { ANALYTICS_DAILY_SCHEDULE_KEY } from "../src/lib/jobs/scheduler";
import { enqueueAnalyticsDaily } from "../src/lib/jobs/enqueue";
import { collectQueueHealthSnapshot } from "../src/lib/jobs/observability";
import {
  incrementAnalyticsJobMetric,
  readAnalyticsJobMetrics,
  readLastAnalyticsDailyRollup,
} from "../src/lib/jobs/job-queue-metrics";
import { readAdminAnalyticsRollup } from "../src/lib/admin-analytics-rollup-store";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}
if (!process.env.ANALYTICS_ROLLUP_ENABLED) {
  process.env.ANALYTICS_ROLLUP_ENABLED = "1";
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

console.log("=== P15-3F STAGING analytics rollup smoke ===");

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
    ANALYTICS_JOB_TYPES.DAILY,
    ANALYTICS_DAILY_SCHEDULE_KEY,
  );
  if (!schedules.length) {
    throw new Error("analytics.daily schedule not registered");
  }
  console.log(
    `  OK  schedule registered cron=${schedules[0]?.cron ?? "?"} key=${schedules[0]?.key ?? "?"}`,
  );

  const health = await collectQueueHealthSnapshot(boss);
  const analyticsQueue = health.queues.find((q) => q.name === "analytics.daily");
  if (!analyticsQueue) throw new Error("analytics.daily queue missing");
  if (!health.analyticsMetrics) throw new Error("analyticsMetrics missing from health snapshot");
  console.log(
    `  OK  queue health schemaVersion=${health.schemaVersion} analytics.daily=present`,
  );

  incrementAnalyticsJobMetric("enqueued");
  const jobId = await enqueueAnalyticsDaily(
    boss,
    { trigger: "smoke", dryRun: true },
    { idempotencyKey: `p15-3f-smoke:${Date.now()}` },
  );
  if (!jobId) throw new Error("enqueue analytics.daily returned null");
  console.log(`  OK  enqueued analytics.daily id=${jobId}`);

  await waitForJobState(
    boss,
    ANALYTICS_JOB_TYPES.DAILY,
    jobId,
    "completed",
    60_000,
  );
  console.log("  OK  analytics.daily completed (dry run)");

  const metrics = readAnalyticsJobMetrics();
  if (metrics.processed < 1) {
    throw new Error(`expected processed >= 1, got ${metrics.processed}`);
  }
  const lastRollup = readLastAnalyticsDailyRollup();
  if (!lastRollup.at || !lastRollup.result) {
    throw new Error("last analytics daily rollup metadata missing");
  }
  console.log(
    `  OK  analytics metrics enqueued=${metrics.enqueued} processed=${metrics.processed} failed=${metrics.failed} periods=${lastRollup.result.periodsWritten}`,
  );

  const cached = await readAdminAnalyticsRollup("all");
  if (cached) {
    console.log("  OK  existing rollup snapshot readable for period=all");
  } else {
    console.log("  OK  no rollup snapshot yet (dry run — expected)");
  }

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-3F STAGING ANALYTICS ROLLUP SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  process.exit(1);
}

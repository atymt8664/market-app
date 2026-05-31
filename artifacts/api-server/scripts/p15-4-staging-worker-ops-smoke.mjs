#!/usr/bin/env node
/**
 * P15-4 — STAGING worker operations smoke (health probe + DLQ list + envelope metadata).
 */
import "../src/load-env.ts";
import { assertJobQueueStagingOnly } from "../src/lib/jobs/env-guard";
import { bootstrapJobWorker } from "../src/lib/jobs/worker-bootstrap";
import { probePgBossJobQueue } from "../src/lib/jobs/job-queue-probe";
import { listDlqJobsForOps } from "../src/lib/jobs/dlq-replay";
import { buildJobEnvelope } from "../src/lib/jobs/enqueue";
import { FOUNDATION_JOB_TYPES } from "../src/lib/jobs/registry";
import { summarizeQueueDepth, collectQueueHealthSnapshot } from "../src/lib/jobs/observability";

if (!process.env.JOB_QUEUE_ENABLED) {
  process.env.JOB_QUEUE_ENABLED = "1";
}

console.log("=== P15-4 STAGING worker operations smoke ===");

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

  const probe = await probePgBossJobQueue();
  if (!probe.configured) throw new Error("pg-boss probe not configured");
  if (probe.status === "fail") throw new Error("pg-boss probe status fail");
  console.log(
    `  OK  pg-boss probe depth=${probe.queueDepth ?? 0} dlq=${probe.dlqDepth ?? 0} schema=${probe.schemaVersion}`,
  );

  const health = await collectQueueHealthSnapshot(boss);
  const depth = summarizeQueueDepth(health);
  console.log(
    `  OK  queue health queued=${depth.totalQueued} active=${depth.totalActive} handlers=${health.workers.length}`,
  );

  const envelope = buildJobEnvelope({ smoke: true }, "p15-4-smoke", FOUNDATION_JOB_TYPES.SYSTEM_PING);
  if (!envelope.jobName) throw new Error("envelope missing jobName metadata");
  console.log("  OK  envelope includes jobName for DLQ replay");

  const dlqJobs = await listDlqJobsForOps(boss, 10);
  console.log(`  OK  DLQ list readable count=${dlqJobs.length}`);

  await runtime.shutdown();
  console.log("  OK  graceful shutdown");

  console.log("\n=== P15-4 STAGING WORKER OPS SMOKE: PASS ===");
} catch (err) {
  console.error("  FAIL", err instanceof Error ? err.message : err);
  if (runtime?.shutdown) {
    await runtime.shutdown().catch(() => {});
  }
  process.exit(1);
}

#!/usr/bin/env node
/**
 * P15-4 — Lightweight job-worker health probe for Docker healthcheck.
 * Exits 0 when pg-boss supervisor is reachable; no secrets logged.
 */
import "../src/load-env.ts";
import { isJobQueueEnabled } from "../src/lib/jobs/env-guard";
import { probePgBossJobQueue } from "../src/lib/jobs/job-queue-probe";

if (!isJobQueueEnabled()) {
  console.error("JOB_QUEUE_ENABLED not set");
  process.exit(1);
}

const probe = await probePgBossJobQueue();
if (!probe.configured || probe.status === "fail") {
  console.error("pg-boss health probe failed");
  process.exit(1);
}

process.exit(0);

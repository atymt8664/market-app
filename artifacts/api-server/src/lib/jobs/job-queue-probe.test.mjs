import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const { STAGING_SUPABASE_REF } = await import("./constants");
const {
  PG_BOSS_DLQ_DEPTH_CRITICAL,
  PG_BOSS_DLQ_DEPTH_WARNING,
  PG_BOSS_QUEUE_DEPTH_CRITICAL,
  PG_BOSS_QUEUE_DEPTH_WARNING,
} = await import("./job-queue-probe");

assert.equal(PG_BOSS_QUEUE_DEPTH_WARNING, 100);
assert.equal(PG_BOSS_QUEUE_DEPTH_CRITICAL, 1000);
assert.equal(PG_BOSS_DLQ_DEPTH_WARNING, 10);
assert.equal(PG_BOSS_DLQ_DEPTH_CRITICAL, 50);

process.env.JOB_QUEUE_ENABLED = undefined;
const { probePgBossJobQueue } = await import("./job-queue-probe");
const off = await probePgBossJobQueue();
assert.equal(off.configured, false);
assert.equal(off.status, "unconfigured");

process.env.JOB_QUEUE_ENABLED = "1";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:invalid:5432/db`;

console.log("job-queue-probe.test.mjs PASS (static thresholds + gate)");

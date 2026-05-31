import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
} = await import("./jobs/constants");
const { isJobQueueEnabled } = await import("./jobs/env-guard");
const { isOpsCronEnabled } = await import("./ops-cron");

process.env.JOB_QUEUE_ENABLED = undefined;
process.env.OPS_CRON_ENABLED = undefined;
assert.equal(isJobQueueEnabled(), false);
assert.equal(isOpsCronEnabled(), false);

process.env.JOB_QUEUE_ENABLED = "1";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.OPS_CRON_ENABLED = "1";
assert.equal(isOpsCronEnabled(), true);

process.env.DATABASE_URL = `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:x@host/db`;
assert.equal(isOpsCronEnabled(), false);

process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.OPS_CRON_ENABLED = "0";
assert.equal(isOpsCronEnabled(), false);

console.log("ops-cron.test.mjs PASS");

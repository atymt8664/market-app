import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
} = await import("./jobs/constants");
const { isJobQueueEnabled } = await import("./jobs/env-guard");
const { isAnalyticsRollupEnabled } = await import("./analytics-rollup");

process.env.JOB_QUEUE_ENABLED = undefined;
process.env.ANALYTICS_ROLLUP_ENABLED = undefined;
assert.equal(isJobQueueEnabled(), false);
assert.equal(isAnalyticsRollupEnabled(), false);

process.env.JOB_QUEUE_ENABLED = "1";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.ANALYTICS_ROLLUP_ENABLED = "1";
assert.equal(isAnalyticsRollupEnabled(), true);

process.env.DATABASE_URL = `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:x@host/db`;
assert.equal(isAnalyticsRollupEnabled(), false);

process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.ANALYTICS_ROLLUP_ENABLED = "0";
assert.equal(isAnalyticsRollupEnabled(), false);

console.log("analytics-rollup.test.mjs PASS");

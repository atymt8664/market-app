import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const {
  STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
} = await import("./jobs/constants");
const {
  assertJobQueueAllowed,
  assertJobQueueStagingOnly,
  isJobQueueEnabled,
} = await import("./jobs/env-guard");
const { isPushOutboxEnabled } = await import("./push-outbox");

process.env.JOB_QUEUE_ENABLED = undefined;
assert.equal(isJobQueueEnabled(), false);
assert.equal(isPushOutboxEnabled(), false);

process.env.JOB_QUEUE_ENABLED = "1";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.PUSH_OUTBOX_ENABLED = "1";
assert.equal(isJobQueueEnabled(), true);
assert.doesNotThrow(() => assertJobQueueAllowed());
assert.doesNotThrow(() => assertJobQueueStagingOnly());
assert.equal(isPushOutboxEnabled(), true);

process.env.DATABASE_URL = `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:x@host/db`;
assert.throws(() => assertJobQueueAllowed(), /PRODUCTION Supabase ref/);
assert.equal(isPushOutboxEnabled(), false);

process.env.JOB_QUEUE_PRODUCTION_ALLOWED = "1";
assert.doesNotThrow(() => assertJobQueueAllowed());
assert.equal(isPushOutboxEnabled(), false);

process.env.PUSH_OUTBOX_ENABLED = "0";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
assert.equal(isPushOutboxEnabled(), false);

console.log("push-outbox.test.mjs PASS");

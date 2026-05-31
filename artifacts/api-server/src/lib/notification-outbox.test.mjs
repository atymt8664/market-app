import assert from "node:assert/strict";
import {
  STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
} from "./jobs/constants";
import {
  assertJobQueueAllowed,
  assertJobQueueStagingOnly,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { isNotificationOutboxEnabled } from "./notification-outbox";

process.env.JOB_QUEUE_ENABLED = undefined;
assert.equal(isJobQueueEnabled(), false);
assert.equal(isNotificationOutboxEnabled(), false);

process.env.JOB_QUEUE_ENABLED = "1";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
process.env.NOTIFICATION_OUTBOX_ENABLED = "1";
assert.equal(isJobQueueEnabled(), true);
assert.doesNotThrow(() => assertJobQueueAllowed());
assert.doesNotThrow(() => assertJobQueueStagingOnly());
assert.equal(isNotificationOutboxEnabled(), true);

process.env.DATABASE_URL = `postgresql://postgres.${PRODUCTION_SUPABASE_REF}:x@host/db`;
assert.throws(() => assertJobQueueAllowed(), /PRODUCTION Supabase ref/);
assert.equal(isNotificationOutboxEnabled(), false);

process.env.JOB_QUEUE_PRODUCTION_ALLOWED = "1";
assert.doesNotThrow(() => assertJobQueueAllowed());
assert.equal(isNotificationOutboxEnabled(), false);

process.env.NOTIFICATION_OUTBOX_ENABLED = "0";
process.env.DATABASE_URL = `postgresql://postgres.${STAGING_SUPABASE_REF}:x@host/db`;
assert.equal(isNotificationOutboxEnabled(), false);

console.log("notification-outbox.test.mjs PASS");

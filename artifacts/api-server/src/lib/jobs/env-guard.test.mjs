import assert from "node:assert/strict";
import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
} from "./constants";
import {
  assertJobQueueAllowed,
  assertJobQueueStagingOnly,
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./env-guard";

function withEnv(overrides, fn) {
  const prev = {};
  for (const [k, v] of Object.entries(overrides)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

withEnv(
  {
    JOB_QUEUE_ENABLED: undefined,
    DATABASE_URL: `postgres://u:p@db.${STAGING_SUPABASE_REF}.supabase.co:5432/postgres`,
  },
  () => {
    assert.equal(isJobQueueEnabled(), false);
  },
);

withEnv(
  {
    JOB_QUEUE_ENABLED: "1",
    DATABASE_URL: `postgres://u:p@db.${STAGING_SUPABASE_REF}.supabase.co:5432/postgres`,
    JOB_QUEUE_PRODUCTION_ALLOWED: undefined,
  },
  () => {
    assert.equal(detectSupabaseProjectRef(), STAGING_SUPABASE_REF);
    assert.doesNotThrow(() => assertJobQueueAllowed());
    assert.doesNotThrow(() => assertJobQueueStagingOnly());
  },
);

withEnv(
  {
    JOB_QUEUE_ENABLED: "1",
    DATABASE_URL: `postgres://u:p@db.${PRODUCTION_SUPABASE_REF}.supabase.co:5432/postgres`,
    JOB_QUEUE_PRODUCTION_ALLOWED: undefined,
  },
  () => {
    assert.throws(() => assertJobQueueAllowed(), /PRODUCTION Supabase ref/);
    assert.throws(() => assertJobQueueStagingOnly(), /PRODUCTION Supabase ref/);
  },
);

withEnv(
  {
    JOB_QUEUE_ENABLED: "1",
    DATABASE_URL: `postgres://u:p@db.${PRODUCTION_SUPABASE_REF}.supabase.co:5432/postgres`,
    JOB_QUEUE_PRODUCTION_ALLOWED: "1",
  },
  () => {
    assert.doesNotThrow(() => assertJobQueueAllowed());
    assert.throws(() => assertJobQueueStagingOnly(), /STAGING Supabase ref/);
  },
);

console.log("env-guard.test.mjs PASS");

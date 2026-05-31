import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
} from "./constants";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/** JOB_QUEUE_ENABLED=1 required to start queue producer or worker. */
export function isJobQueueEnabled(): boolean {
  return isTrue(process.env["JOB_QUEUE_ENABLED"]);
}

function rawEnvBlob(): string {
  return [process.env["DATABASE_URL"], process.env["SUPABASE_URL"]]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

/** Detect which Supabase ref the runtime is pointed at (no secret output). */
export function detectSupabaseProjectRef(): typeof STAGING_SUPABASE_REF | typeof PRODUCTION_SUPABASE_REF | null {
  const blob = rawEnvBlob();
  if (blob.includes(PRODUCTION_SUPABASE_REF)) return PRODUCTION_SUPABASE_REF;
  if (blob.includes(STAGING_SUPABASE_REF)) return STAGING_SUPABASE_REF;
  return null;
}

/**
 * P15-2 guard: queue operations allowed only when explicitly enabled and not on
 * PRODUCTION ref unless JOB_QUEUE_PRODUCTION_ALLOWED=1 (blocked for P15-2).
 */
export function assertJobQueueAllowed(): void {
  if (!isJobQueueEnabled()) {
    throw new Error(
      "JOB_QUEUE_ENABLED must be 1 to use the pg-boss job queue (P15 foundation)",
    );
  }

  if (!process.env["DATABASE_URL"]?.trim()) {
    throw new Error("DATABASE_URL is required for the job queue");
  }

  const ref = detectSupabaseProjectRef();

  if (ref === PRODUCTION_SUPABASE_REF && !isTrue(process.env["JOB_QUEUE_PRODUCTION_ALLOWED"])) {
    throw new Error(
      "REFUSE: job queue blocked on PRODUCTION Supabase ref during P15-2 (STAGING only)",
    );
  }

  if (ref !== STAGING_SUPABASE_REF && ref !== PRODUCTION_SUPABASE_REF) {
    throw new Error(
      "REFUSE: cannot confirm STAGING or PRODUCTION Supabase ref in DATABASE_URL / SUPABASE_URL",
    );
  }
}

/** STAGING-only guard for P15-2 smoke and deploy scripts. */
export function assertJobQueueStagingOnly(): void {
  assertJobQueueAllowed();
  const ref = detectSupabaseProjectRef();
  if (ref !== STAGING_SUPABASE_REF) {
    throw new Error("REFUSE: P15-2 job queue operations require STAGING Supabase ref");
  }
}

/** Official Supabase project refs — never mix (P1 / P15 ADR-005). */
export const STAGING_SUPABASE_REF = "qkczposlooaldmsjfmun";
export const PRODUCTION_SUPABASE_REF = "nptfxtkedqndkgmrcntn";

/** pg-boss schema name (override via JOB_QUEUE_SCHEMA). */
export const DEFAULT_JOB_QUEUE_SCHEMA = "pgboss";

/** Envelope version for queued payloads. */
export const JOB_ENVELOPE_VERSION = 1 as const;

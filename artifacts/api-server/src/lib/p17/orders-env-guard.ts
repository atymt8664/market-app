import {
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
} from "../jobs/constants";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

function rawEnvBlob(): string {
  return [process.env["DATABASE_URL"], process.env["SUPABASE_URL"]]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

/** Detect which Supabase ref the runtime is pointed at (no secret output). */
export function detectSupabaseProjectRef():
  | typeof STAGING_SUPABASE_REF
  | typeof PRODUCTION_SUPABASE_REF
  | null {
  const blob = rawEnvBlob();
  if (blob.includes(PRODUCTION_SUPABASE_REF)) return PRODUCTION_SUPABASE_REF;
  if (blob.includes(STAGING_SUPABASE_REF)) return STAGING_SUPABASE_REF;
  return null;
}

/** P17-4: real orders DB/API when explicitly enabled. */
export function isP17OrdersApiEnabled(): boolean {
  return isTrue(process.env["P17_ORDERS_API_ENABLED"]);
}

/**
 * P17-4 guard: DB-backed orders API allowed only when enabled and on STAGING ref
 * unless P17_ORDERS_PRODUCTION_ALLOWED=1 (blocked by default).
 */
export function assertP17OrdersApiAllowed(): void {
  if (!isP17OrdersApiEnabled()) {
    throw new Error(
      "P17_ORDERS_API_ENABLED must be 1 to use the database orders API (P17-4)",
    );
  }

  if (!process.env["DATABASE_URL"]?.trim()) {
    throw new Error("DATABASE_URL is required for the orders API");
  }

  const ref = detectSupabaseProjectRef();

  if (
    ref === PRODUCTION_SUPABASE_REF &&
    !isTrue(process.env["P17_ORDERS_PRODUCTION_ALLOWED"])
  ) {
    throw new Error(
      "REFUSE: P17 orders API blocked on PRODUCTION Supabase ref (STAGING only until P17-19)",
    );
  }

  if (ref !== STAGING_SUPABASE_REF && ref !== PRODUCTION_SUPABASE_REF) {
    throw new Error(
      "REFUSE: cannot confirm STAGING or PRODUCTION Supabase ref in DATABASE_URL / SUPABASE_URL",
    );
  }
}

/** STAGING-only guard for P17-4 smoke and deploy scripts. */
export function assertP17OrdersStagingOnly(): void {
  assertP17OrdersApiAllowed();
  const ref = detectSupabaseProjectRef();
  if (ref !== STAGING_SUPABASE_REF) {
    throw new Error("REFUSE: P17-4 orders API operations require STAGING Supabase ref");
  }
}

/** When false, routes fall back to the static mock provider (PROD-safe default). */
export function useP17OrdersDatabaseProvider(): boolean {
  if (!isP17OrdersApiEnabled()) return false;
  try {
    assertP17OrdersApiAllowed();
    return true;
  } catch {
    return false;
  }
}

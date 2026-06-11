import {
  detectSupabaseProjectRef,
  PRODUCTION_SUPABASE_REF,
  STAGING_SUPABASE_REF,
} from "../jobs";
import type { BroadcastAudience } from "./types";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/** Master switch — broadcasts disabled unless BROADCAST_ENABLED=1. */
export function isBroadcastEnabled(): boolean {
  return isTrue(process.env["BROADCAST_ENABLED"]);
}

/** Production broadcast send requires explicit opt-in. */
export function isBroadcastProductionAllowed(): boolean {
  return isTrue(process.env["BROADCAST_PRODUCTION_ALLOWED"]);
}

/** All-users production broadcast requires second explicit opt-in. */
export function isBroadcastAllUsersProductionAllowed(): boolean {
  return isTrue(process.env["BROADCAST_ALL_USERS_PRODUCTION"]);
}

export function parseBroadcastTestEmails(): string[] {
  const raw =
    process.env["BROADCAST_TEST_EMAILS"]?.trim() ||
    process.env["PROD_SMOKE_EMAIL"]?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export class BroadcastSafetyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BroadcastSafetyError";
    this.code = code;
  }
}

export function assertBroadcastFeatureEnabled(): void {
  if (!isBroadcastEnabled()) {
    throw new BroadcastSafetyError(
      "BROADCAST_DISABLED",
      "Platform broadcasts are disabled (set BROADCAST_ENABLED=1)",
    );
  }
}

export function assertBroadcastSendAllowed(audience: BroadcastAudience): void {
  assertBroadcastFeatureEnabled();
  const ref = detectSupabaseProjectRef();

  if (ref === STAGING_SUPABASE_REF) {
    return;
  }

  if (ref === PRODUCTION_SUPABASE_REF) {
    if (!isBroadcastProductionAllowed()) {
      throw new BroadcastSafetyError(
        "BROADCAST_PRODUCTION_BLOCKED",
        "Production broadcasts require BROADCAST_PRODUCTION_ALLOWED=1",
      );
    }
    if (audience === "all_users" && !isBroadcastAllUsersProductionAllowed()) {
      throw new BroadcastSafetyError(
        "BROADCAST_ALL_USERS_BLOCKED",
        "All-users production broadcast requires BROADCAST_ALL_USERS_PRODUCTION=1",
      );
    }
    if (audience === "test_audience" && parseBroadcastTestEmails().length === 0) {
      throw new BroadcastSafetyError(
        "BROADCAST_TEST_EMAILS_MISSING",
        "Test audience requires BROADCAST_TEST_EMAILS or PROD_SMOKE_EMAIL",
      );
    }
    return;
  }

  throw new BroadcastSafetyError(
    "BROADCAST_ENV_UNKNOWN",
    "Cannot confirm STAGING or PRODUCTION Supabase ref for broadcast",
  );
}

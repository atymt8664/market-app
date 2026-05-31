import { runAutoEscalationAll } from "./admin-operations-queue";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3E: ops cron active on STAGING when queue + cron flags are set.
 * PRODUCTION keeps synchronous escalation on admin read (no behavior change).
 */
export function isOpsCronEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["OPS_CRON_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

/**
 * Run sync SLA escalation before admin reads when pg-boss cron is not active.
 * STAGING with OPS_CRON_ENABLED skips inline work — worker schedule handles it.
 */
export async function ensureSlaEscalationBeforeAdminRead(): Promise<void> {
  if (isOpsCronEnabled()) return;
  await runAutoEscalationAll();
}

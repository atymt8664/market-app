import {
  computeAdminAnalyticsPayload,
  type AdminStatsPeriod,
} from "./admin-analytics-compute";
import { readAdminAnalyticsRollup } from "./admin-analytics-rollup-store";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";
import type { AdminAnalyticsPayload } from "./admin-analytics-compute";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3F: analytics rollup active on STAGING when queue + rollup flags are set.
 * PRODUCTION keeps synchronous compute on every request (no behavior change).
 */
export function isAnalyticsRollupEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["ANALYTICS_ROLLUP_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

/**
 * Resolve admin analytics: STAGING reads precomputed daily rollup when available;
 * otherwise falls back to live compute (PRODUCTION always sync).
 */
export async function resolveAdminAnalytics(
  period: AdminStatsPeriod,
): Promise<AdminAnalyticsPayload> {
  if (isAnalyticsRollupEnabled()) {
    const cached = await readAdminAnalyticsRollup(period);
    if (cached) {
      return {
        ...cached,
        period,
        generatedAt: new Date().toISOString(),
      };
    }
  }
  return computeAdminAnalyticsPayload(period);
}

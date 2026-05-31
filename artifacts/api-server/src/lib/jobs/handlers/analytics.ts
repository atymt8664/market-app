import type { Job } from "pg-boss";
import {
  computeAllAdminAnalyticsRollups,
  ADMIN_STATS_PERIODS,
} from "../../admin-analytics-compute";
import {
  analyticsRollupSnapshotDate,
  upsertAllAdminAnalyticsRollups,
} from "../../admin-analytics-rollup-store";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import {
  incrementAnalyticsJobMetric,
  recordAnalyticsDailyRollupResult,
} from "../job-queue-metrics";
import type { AnalyticsDailyPayload } from "../analytics-types";
import { ANALYTICS_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";

function parseEnvelope(data: unknown): JobEnvelope<AnalyticsDailyPayload> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<AnalyticsDailyPayload>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

function isStagingDryRun(payload: AnalyticsDailyPayload): boolean {
  return (
    payload.dryRun === true &&
    detectSupabaseProjectRef() === STAGING_SUPABASE_REF
  );
}

async function handleAnalyticsDaily(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope(job.data);
    const { trigger } = envelope.payload;
    const snapshotDate = analyticsRollupSnapshotDate();

    if (isStagingDryRun(envelope.payload)) {
      recordAnalyticsDailyRollupResult({
        periodsWritten: ADMIN_STATS_PERIODS.length,
        snapshotDate,
      });
      incrementAnalyticsJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          kind: "analytics_daily_dry_run",
        },
        "P15 analytics job dry run (STAGING smoke)",
      );
      continue;
    }

    try {
      const payloads = await computeAllAdminAnalyticsRollups();
      const periodsWritten = await upsertAllAdminAnalyticsRollups(
        payloads,
        snapshotDate,
      );
      recordAnalyticsDailyRollupResult({ periodsWritten, snapshotDate });
      incrementAnalyticsJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          periodsWritten,
          snapshotDate,
          kind: "analytics_daily_completed",
        },
        "P15 analytics job processed: analytics.daily",
      );
    } catch (err) {
      incrementAnalyticsJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3F analytics rollup handlers. */
export function registerAnalyticsJobHandlers(): void {
  registerJobHandler({
    name: ANALYTICS_JOB_TYPES.DAILY,
    handler: handleAnalyticsDaily,
  });
}

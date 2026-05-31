import type { PgBoss } from "pg-boss";
import { isOpsCronEnabled } from "../ops-cron";
import { isAnalyticsRollupEnabled } from "../analytics-rollup";
import { detectSupabaseProjectRef } from "./env-guard";
import { buildJobEnvelope } from "./enqueue";
import { OPS_JOB_TYPES, ANALYTICS_JOB_TYPES } from "./registry";
import { sendOptionsForPriority } from "./retry-policy";
import type { OpsSlaEscalatePayload } from "./ops-types";
import type { AnalyticsDailyPayload } from "./analytics-types";
import { logger } from "../logger";

/** Default: every 10 minutes (P15 doc: SLA cron 5–15m). */
export const DEFAULT_OPS_SLA_ESCALATE_CRON = "*/10 * * * *";

export const OPS_SLA_ESCALATE_SCHEDULE_KEY = "ops.sla_escalate.staging";

/** Default: daily 02:00 UTC (P15 doc). */
export const DEFAULT_ANALYTICS_DAILY_CRON = "0 2 * * *";

export const ANALYTICS_DAILY_SCHEDULE_KEY = "analytics.daily.staging";

function resolveOpsSlaCron(): string {
  const raw = process.env["OPS_SLA_ESCALATE_CRON"]?.trim();
  return raw || DEFAULT_OPS_SLA_ESCALATE_CRON;
}

/**
 * Register pg-boss cron schedules for operations jobs (STAGING + OPS_CRON_ENABLED).
 * Idempotent — uses schedule `key` for upsert semantics on worker restart.
 */
export async function registerOpsSchedules(boss: PgBoss): Promise<void> {
  if (!isOpsCronEnabled()) {
    logger.info("OPS cron disabled — skipping schedule registration");
    return;
  }

  const cron = resolveOpsSlaCron();
  const payload: OpsSlaEscalatePayload = { trigger: "cron" };
  const envelope = buildJobEnvelope(payload, OPS_SLA_ESCALATE_SCHEDULE_KEY);

  await boss.schedule(OPS_JOB_TYPES.SLA_ESCALATE, cron, envelope, {
    ...sendOptionsForPriority("normal"),
    key: OPS_SLA_ESCALATE_SCHEDULE_KEY,
  });

  const schedules = await boss.getSchedules(
    OPS_JOB_TYPES.SLA_ESCALATE,
    OPS_SLA_ESCALATE_SCHEDULE_KEY,
  );

  logger.info(
    {
      jobName: OPS_JOB_TYPES.SLA_ESCALATE,
      cron,
      scheduleKey: OPS_SLA_ESCALATE_SCHEDULE_KEY,
      envRef: detectSupabaseProjectRef(),
      registered: schedules.length > 0,
    },
    "P15 ops cron schedule registered",
  );
}

function resolveAnalyticsDailyCron(): string {
  const raw = process.env["ANALYTICS_DAILY_CRON"]?.trim();
  return raw || DEFAULT_ANALYTICS_DAILY_CRON;
}

/**
 * Register pg-boss cron schedules for analytics rollup jobs (STAGING + ANALYTICS_ROLLUP_ENABLED).
 */
export async function registerAnalyticsSchedules(boss: PgBoss): Promise<void> {
  if (!isAnalyticsRollupEnabled()) {
    logger.info("Analytics rollup disabled — skipping schedule registration");
    return;
  }

  const cron = resolveAnalyticsDailyCron();
  const payload: AnalyticsDailyPayload = { trigger: "cron" };
  const envelope = buildJobEnvelope(payload, ANALYTICS_DAILY_SCHEDULE_KEY);

  await boss.schedule(ANALYTICS_JOB_TYPES.DAILY, cron, envelope, {
    ...sendOptionsForPriority("low"),
    key: ANALYTICS_DAILY_SCHEDULE_KEY,
  });

  const schedules = await boss.getSchedules(
    ANALYTICS_JOB_TYPES.DAILY,
    ANALYTICS_DAILY_SCHEDULE_KEY,
  );

  logger.info(
    {
      jobName: ANALYTICS_JOB_TYPES.DAILY,
      cron,
      scheduleKey: ANALYTICS_DAILY_SCHEDULE_KEY,
      envRef: detectSupabaseProjectRef(),
      registered: schedules.length > 0,
    },
    "P15 analytics cron schedule registered",
  );
}

/** Bootstrap all P15-3E/F schedules (called from job worker after queue start). */
export async function bootstrapJobSchedules(boss: PgBoss): Promise<void> {
  await registerOpsSchedules(boss);
  await registerAnalyticsSchedules(boss);
}

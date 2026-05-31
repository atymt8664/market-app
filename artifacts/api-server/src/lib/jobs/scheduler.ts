import type { PgBoss } from "pg-boss";
import { isOpsCronEnabled } from "../ops-cron";
import { detectSupabaseProjectRef } from "./env-guard";
import { buildJobEnvelope } from "./enqueue";
import { OPS_JOB_TYPES } from "./registry";
import { sendOptionsForPriority } from "./retry-policy";
import type { OpsSlaEscalatePayload } from "./ops-types";
import { logger } from "../logger";

/** Default: every 10 minutes (P15 doc: SLA cron 5–15m). */
export const DEFAULT_OPS_SLA_ESCALATE_CRON = "*/10 * * * *";

export const OPS_SLA_ESCALATE_SCHEDULE_KEY = "ops.sla_escalate.staging";

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

/** Bootstrap all P15-3E schedules (called from job worker after queue start). */
export async function bootstrapJobSchedules(boss: PgBoss): Promise<void> {
  await registerOpsSchedules(boss);
}

import type { Job } from "pg-boss";
import { runAutoEscalationAll } from "../../admin-operations-queue";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import {
  incrementOpsJobMetric,
  recordOpsSlaEscalationResult,
} from "../job-queue-metrics";
import type { OpsSlaEscalatePayload } from "../ops-types";
import { OPS_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";

function parseEnvelope(data: unknown): JobEnvelope<OpsSlaEscalatePayload> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<OpsSlaEscalatePayload>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

function isStagingDryRun(payload: OpsSlaEscalatePayload): boolean {
  return (
    payload.dryRun === true &&
    detectSupabaseProjectRef() === STAGING_SUPABASE_REF
  );
}

async function handleOpsSlaEscalate(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope(job.data);
    const { trigger } = envelope.payload;

    if (isStagingDryRun(envelope.payload)) {
      const empty = {
        verification: 0,
        reports: 0,
        support: 0,
        ads: 0,
      };
      recordOpsSlaEscalationResult(empty);
      incrementOpsJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          kind: "ops_sla_escalate_dry_run",
        },
        "P15 ops job dry run (STAGING smoke)",
      );
      continue;
    }

    try {
      const result = await runAutoEscalationAll();
      recordOpsSlaEscalationResult(result);
      incrementOpsJobMetric("processed");
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          trigger,
          result,
          kind: "ops_sla_escalate_completed",
        },
        "P15 ops job processed: ops.sla_escalate",
      );
    } catch (err) {
      incrementOpsJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3E operations cron handlers. */
export function registerOpsJobHandlers(): void {
  registerJobHandler({
    name: OPS_JOB_TYPES.SLA_ESCALATE,
    handler: handleOpsSlaEscalate,
  });
}

import type { Job } from "pg-boss";
import { logger } from "../../logger";
import {
  FOUNDATION_JOB_TYPES,
  registerJobHandler,
} from "../registry";

async function handleSystemPing(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    logger.info(
      { jobId: job.id, jobName: job.name },
      "P15 foundation job processed: system.ping",
    );
  }
}

/** Intentionally fails — used only by STAGING smoke to verify retry/DLQ path. */
async function handleDlqProbe(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    logger.warn({ jobId: job.id }, "system.dlq_probe intentional failure");
    throw new Error("dlq_probe_intentional_failure");
  }
}

/** Register P15-2 foundation handlers only (no business logic). */
export function registerFoundationJobHandlers(): void {
  registerJobHandler({
    name: FOUNDATION_JOB_TYPES.SYSTEM_PING,
    handler: handleSystemPing,
  });
  registerJobHandler({
    name: FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
    handler: handleDlqProbe,
  });
}

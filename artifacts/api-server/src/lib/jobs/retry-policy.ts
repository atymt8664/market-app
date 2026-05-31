import type { SendOptions } from "pg-boss";

/** Matches P15-background-jobs.md standard retry policy (foundation). */
export type JobPriority = "critical" | "high" | "normal" | "low";

const PRIORITY_VALUES: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Shared retry defaults for Phase 1 (pg-boss). */
export const STANDARD_RETRY_OPTIONS: Pick<
  SendOptions,
  "retryLimit" | "retryDelay" | "retryBackoff" | "retryDelayMax"
> = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 3600,
};

/** Per-priority send options (foundation — extend in P15-3 per job type). */
export function sendOptionsForPriority(priority: JobPriority): SendOptions {
  return {
    ...STANDARD_RETRY_OPTIONS,
    priority: PRIORITY_VALUES[priority],
  };
}

/** DLQ probe uses fewer retries for faster smoke failure. */
export const DLQ_PROBE_RETRY_OPTIONS: Pick<
  SendOptions,
  "retryLimit" | "retryDelay" | "retryBackoff"
> = {
  retryLimit: 2,
  retryDelay: 1,
  retryBackoff: false,
};

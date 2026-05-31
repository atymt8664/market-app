import type { Job, PgBoss, QueueResult } from "pg-boss";
import { FOUNDATION_JOB_TYPES } from "./registry";
import {
  DLQ_PROBE_RETRY_OPTIONS,
  STANDARD_RETRY_OPTIONS,
} from "./retry-policy";

/** Central dead-letter queue for foundation jobs (P15-4 admin replay). */
export const DLQ_QUEUE_NAME = "system.dead_letter";

type QueueSeed = {
  name: string;
  options: {
    retryLimit?: number;
    retryDelay?: number;
    retryBackoff?: boolean;
    retryDelayMax?: number;
    deadLetter?: string;
  };
};

const FOUNDATION_QUEUE_SEEDS: QueueSeed[] = [
  {
    name: DLQ_QUEUE_NAME,
    options: { retryLimit: 0 },
  },
  {
    name: FOUNDATION_JOB_TYPES.SYSTEM_PING,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
    options: {
      ...DLQ_PROBE_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
];

/** Idempotent queue creation for foundation job types. */
export async function ensureFoundationQueues(boss: PgBoss): Promise<void> {
  for (const seed of FOUNDATION_QUEUE_SEEDS) {
    const existing = await boss.getQueue(seed.name);
    if (!existing) {
      await boss.createQueue(seed.name, seed.options);
    }
  }
}

/** Failed jobs for a queue (DLQ foundation — uses pg-boss findJobs). */
export async function listFailedJobs(
  boss: PgBoss,
  queueName: string,
  limit = 25,
) {
  const jobs = await boss.findJobs(queueName, { queued: false });
  return jobs.filter((j: { state: string }) => j.state === "failed").slice(0, limit);
}

/** Jobs routed to the dead-letter queue. */
export async function listDeadLetterJobs(boss: PgBoss, limit = 25) {
  return listFailedJobs(boss, DLQ_QUEUE_NAME, limit);
}

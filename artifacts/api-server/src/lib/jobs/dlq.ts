import type { PgBoss } from "pg-boss";
import {
  EMAIL_JOB_TYPES,
  FOUNDATION_JOB_TYPES,
  NOTIFICATION_JOB_TYPES,
  OPS_JOB_TYPES,
  ANALYTICS_JOB_TYPES,
  PUSH_JOB_TYPES,
} from "./registry";
import {
  DLQ_PROBE_RETRY_OPTIONS,
  STANDARD_RETRY_OPTIONS,
} from "./retry-policy";

/** Central dead-letter queue (P15-4 admin replay). */
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

const REGISTERED_QUEUE_SEEDS: QueueSeed[] = [
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
  {
    name: EMAIL_JOB_TYPES.AUTH_OTP,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: EMAIL_JOB_TYPES.AUTH_RESET,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: NOTIFICATION_JOB_TYPES.IN_APP,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: PUSH_JOB_TYPES.DELIVER,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: OPS_JOB_TYPES.SLA_ESCALATE,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
  {
    name: ANALYTICS_JOB_TYPES.DAILY,
    options: {
      ...STANDARD_RETRY_OPTIONS,
      deadLetter: DLQ_QUEUE_NAME,
    },
  },
];

/** Idempotent queue creation for all registered job types. */
export async function ensureRegisteredQueues(boss: PgBoss): Promise<void> {
  for (const seed of REGISTERED_QUEUE_SEEDS) {
    const existing = await boss.getQueue(seed.name);
    if (!existing) {
      await boss.createQueue(seed.name, seed.options);
    }
  }
}

/** @deprecated use ensureRegisteredQueues */
export async function ensureFoundationQueues(boss: PgBoss): Promise<void> {
  return ensureRegisteredQueues(boss);
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

export function listRegisteredQueueNames(): string[] {
  return REGISTERED_QUEUE_SEEDS.map((s) => s.name);
}

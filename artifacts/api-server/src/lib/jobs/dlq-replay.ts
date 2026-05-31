import type { PgBoss } from "pg-boss";
import { DLQ_QUEUE_NAME } from "./dlq";
import { enqueueJob } from "./enqueue";
import type { JobEnvelope } from "./types";
import type { RegisteredJobName } from "./registry";
import { REGISTERED_JOB_NAMES } from "./registry";

export type DlqJobSummary = {
  id: string;
  sourceQueue: string | null;
  envRef: string | null;
  retryCount: number;
  createdOn: string;
  hasReplayMetadata: boolean;
};

function parseEnvelope(data: unknown): JobEnvelope | null {
  if (!data || typeof data !== "object") return null;
  const envelope = data as JobEnvelope;
  if (envelope.v !== 1 || !("payload" in envelope)) return null;
  return envelope;
}

function resolveSourceQueue(envelope: JobEnvelope): RegisteredJobName | null {
  if (envelope.jobName && isRegisteredJobName(envelope.jobName)) {
    return envelope.jobName;
  }
  return null;
}

function isRegisteredJobName(name: string): name is RegisteredJobName {
  return (REGISTERED_JOB_NAMES as readonly string[]).includes(name);
}

/** List pending jobs in the central dead-letter queue (P15-4 ops). */
export async function listDlqJobsForOps(
  boss: PgBoss,
  limit = 25,
): Promise<DlqJobSummary[]> {
  const jobs = await boss.findJobs(DLQ_QUEUE_NAME, { queued: true });
  return jobs
    .filter((j) => j.state === "created" || j.state === "retry" || j.state === "failed")
    .slice(0, limit)
    .map((job) => {
      const envelope = parseEnvelope(job.data);
      const sourceQueue = envelope ? resolveSourceQueue(envelope) : null;
      return {
        id: job.id,
        sourceQueue,
        envRef: envelope?.envRef ?? null,
        retryCount: job.retryCount,
        createdOn: job.createdOn.toISOString(),
        hasReplayMetadata: sourceQueue != null,
      };
    });
}

export type ReplayDeadLetterResult = {
  dlqJobId: string;
  sourceQueue: RegisteredJobName;
  replayedJobId: string;
};

/**
 * Replay a dead-letter job back to its source queue (STAGING ops — idempotent handlers required).
 * Removes the DLQ entry after successful re-enqueue.
 */
export async function replayDeadLetterJob(
  boss: PgBoss,
  dlqJobId: string,
): Promise<ReplayDeadLetterResult> {
  const matches = await boss.findJobs(DLQ_QUEUE_NAME, { id: dlqJobId, queued: true });
  const job = matches[0];
  if (!job) {
    throw new Error("DLQ job not found or already processed");
  }

  const envelope = parseEnvelope(job.data);
  if (!envelope) {
    throw new Error("DLQ job has invalid envelope — cannot replay");
  }

  const sourceQueue = resolveSourceQueue(envelope);
  if (!sourceQueue) {
    throw new Error(
      "DLQ job missing jobName metadata — replay not supported for legacy jobs",
    );
  }

  const replayKey = envelope.idempotencyKey
    ? `${envelope.idempotencyKey}:replay:${Date.now()}`
    : `dlq-replay:${dlqJobId}:${Date.now()}`;

  const replayedJobId = await enqueueJob(boss, sourceQueue, envelope.payload, {
    idempotencyKey: replayKey,
  });
  if (!replayedJobId) {
    throw new Error("Failed to re-enqueue replay job");
  }

  await boss.deleteJob(DLQ_QUEUE_NAME, dlqJobId);

  return {
    dlqJobId,
    sourceQueue,
    replayedJobId,
  };
}

/** Retry a failed job still on its source queue (before DLQ routing). */
export async function retryFailedSourceJob(
  boss: PgBoss,
  queueName: RegisteredJobName,
  jobId: string,
): Promise<void> {
  const result = await boss.retry(queueName, jobId);
  if (!result || (typeof result === "object" && "updated" in result && result.updated === 0)) {
    throw new Error("Source job retry failed — job not in failed state");
  }
}

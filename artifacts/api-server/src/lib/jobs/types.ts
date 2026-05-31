import type { JobPriority } from "./retry-policy";
import { JOB_ENVELOPE_VERSION } from "./constants";

/** Minimal payload wrapper — no secrets; env ref for audit (ADR-005). */
export type JobEnvelope<TPayload = unknown> = {
  v: typeof JOB_ENVELOPE_VERSION;
  envRef: string;
  idempotencyKey?: string;
  payload: TPayload;
};

export type EnqueueJobOptions = {
  priority?: JobPriority;
  idempotencyKey?: string;
  startAfterSeconds?: number;
};

export type QueueHealthSnapshot = {
  enabled: boolean;
  stagingOnly: boolean;
  schema: string;
  schemaVersion: number | null;
  installed: boolean;
  queues: Array<{
    name: string;
    queuedCount: number;
    activeCount: number;
    deferredCount: number;
    totalCount: number;
  }>;
  workers: Array<{
    id: string;
    name: string;
    state: string;
    count: number;
  }>;
};

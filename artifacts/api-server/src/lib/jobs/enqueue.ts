import type { PgBoss } from "pg-boss";
import { detectSupabaseProjectRef } from "./env-guard";
import { DLQ_PROBE_RETRY_OPTIONS, sendOptionsForPriority } from "./retry-policy";
import type { EnqueueJobOptions, JobEnvelope } from "./types";
import { JOB_ENVELOPE_VERSION } from "./constants";
import {
  FOUNDATION_JOB_TYPES,
  type RegisteredJobName,
} from "./registry";

function wrapPayload<T>(payload: T, idempotencyKey?: string): JobEnvelope<T> {
  const envRef = detectSupabaseProjectRef() ?? "unknown";
  return {
    v: JOB_ENVELOPE_VERSION,
    envRef,
    ...(idempotencyKey ? { idempotencyKey } : {}),
    payload,
  };
}

/**
 * Enqueue a registered job (producer API — not wired to HTTP routes in P15-2).
 */
export async function enqueueJob<TPayload>(
  boss: PgBoss,
  jobName: RegisteredJobName,
  payload: TPayload,
  options: EnqueueJobOptions = {},
): Promise<string | null> {
  const envelope = wrapPayload(payload, options.idempotencyKey);
  const priority = options.priority ?? "normal";
  const sendOpts = {
    ...(jobName === FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE
      ? { ...DLQ_PROBE_RETRY_OPTIONS, priority: sendOptionsForPriority(priority).priority }
      : sendOptionsForPriority(priority)),
    ...(options.idempotencyKey ? { singletonKey: options.idempotencyKey } : {}),
    ...(options.startAfterSeconds != null
      ? { startAfter: options.startAfterSeconds }
      : {}),
  };

  return boss.send(jobName, envelope, sendOpts);
}

export async function enqueueFoundationPing(
  boss: PgBoss,
  payload: Record<string, unknown> = { probe: true },
  options?: EnqueueJobOptions,
): Promise<string | null> {
  return enqueueJob(boss, FOUNDATION_JOB_TYPES.SYSTEM_PING, payload, options);
}

export async function enqueueDlqProbe(
  boss: PgBoss,
  payload: Record<string, unknown> = { probe: true },
): Promise<string | null> {
  return enqueueJob(boss, FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE, payload, {
    priority: "low",
    idempotencyKey: `dlq-probe:${Date.now()}`,
  });
}

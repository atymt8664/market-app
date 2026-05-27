import { getPushRedisClient, isPushQueueAvailable } from "./push-queue";

export const PUSH_METRICS_KEYS = {
  processed: "souq:p11:push:metrics:processed",
  failed: "souq:p11:push:metrics:failed",
  active: "souq:p11:push:metrics:active",
} as const;

export type PushQueueMetricsSnapshot = {
  available: boolean;
  pending: number | null;
  active: number | null;
  processed: number | null;
  failed: number | null;
  retryCount: number | null;
};

async function readCounter(key: string): Promise<number | null> {
  const client = await getPushRedisClient();
  if (!client?.isOpen) return null;
  try {
    const raw = await client.get(key);
    if (raw == null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return null;
  }
}

export async function readPushQueueMetrics(queueKey: string): Promise<PushQueueMetricsSnapshot> {
  if (!isPushQueueAvailable()) {
    return {
      available: false,
      pending: null,
      active: null,
      processed: null,
      failed: null,
      retryCount: null,
    };
  }

  const client = await getPushRedisClient();
  if (!client?.isOpen) {
    return {
      available: false,
      pending: null,
      active: null,
      processed: null,
      failed: null,
      retryCount: null,
    };
  }

  let pending: number | null = null;
  try {
    pending = await client.lLen(queueKey);
  } catch {
    pending = null;
  }

  const [active, processed, failed] = await Promise.all([
    readCounter(PUSH_METRICS_KEYS.active),
    readCounter(PUSH_METRICS_KEYS.processed),
    readCounter(PUSH_METRICS_KEYS.failed),
  ]);

  return {
    available: true,
    pending,
    active,
    processed,
    failed,
    retryCount: failed,
  };
}

export async function incrementPushMetric(key: string, delta = 1): Promise<void> {
  const client = await getPushRedisClient();
  if (!client?.isOpen) return;
  try {
    await client.incrBy(key, delta);
  } catch {
    /* worker continues */
  }
}

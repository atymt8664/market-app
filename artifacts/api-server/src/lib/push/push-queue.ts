import type { RedisClientType } from "redis";

export const PUSH_DELIVERY_QUEUE_KEY = "souq:p11:push:delivery";

export type PushDeliveryJob = {
  userId: number;
  notificationId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
};

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

function redisUrl(): string | undefined {
  const raw = process.env.REDIS_URL?.trim() || process.env.QUEUE_REDIS_URL?.trim();
  return raw || undefined;
}

export function isPushQueueAvailable(): boolean {
  return Boolean(redisUrl());
}

export async function getPushRedisClient(): Promise<RedisClientType | null> {
  const url = redisUrl();
  if (!url) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisConnectPromise = (async () => {
    const { createClient } = await import("redis");
    const client = createClient({ url }) as RedisClientType;
    client.on("error", () => {
      /* logged at delivery layer */
    });
    await client.connect();
    redisClient = client;
    return client;
  })();

  try {
    return await redisConnectPromise;
  } catch {
    redisConnectPromise = null;
    redisClient = null;
    return null;
  }
}

export async function enqueuePushDeliveryJob(job: PushDeliveryJob): Promise<boolean> {
  const client = await getPushRedisClient();
  if (!client) return false;
  await client.lPush(PUSH_DELIVERY_QUEUE_KEY, JSON.stringify(job));
  return true;
}

export async function blockingPopPushDeliveryJob(
  timeoutSeconds = 5,
): Promise<PushDeliveryJob | null> {
  const client = await getPushRedisClient();
  if (!client) return null;
  const result = await client.brPop(PUSH_DELIVERY_QUEUE_KEY, timeoutSeconds);
  if (!result?.element) return null;
  try {
    return JSON.parse(result.element) as PushDeliveryJob;
  } catch {
    return null;
  }
}

export async function closePushRedisClient(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  redisConnectPromise = null;
}

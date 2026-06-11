import type { PushDeliveryJob } from "./push-queue";
import { notificationDeepLinkPath } from "../notifications/deep-link";

export const PUSH_PAYLOAD_VERSION = 1;

export type PushNotificationPayloadData = {
  v: number;
  url: string;
  notificationId: number;
  type: string;
  category: string;
  domain: string;
  priority: number;
  dedupKey: string | null;
  aggregationKey: string | null;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  data: PushNotificationPayloadData;
};

export function resolvePushDeepLink(job: PushDeliveryJob): string {
  const explicit = job.deepLinkPath?.trim();
  if (explicit?.startsWith("/")) return explicit;
  return notificationDeepLinkPath({
    type: job.type,
    entityType: job.entityType,
    entityId: job.entityId,
    metadata: job.metadata ?? null,
  });
}

export function buildPushNotificationPayload(job: PushDeliveryJob): PushNotificationPayload {
  return {
    title: String(job.title ?? "").slice(0, 120),
    body: String(job.body ?? "").slice(0, 240),
    data: {
      v: PUSH_PAYLOAD_VERSION,
      url: resolvePushDeepLink(job),
      notificationId: job.notificationId,
      type: job.type,
      category: job.category ?? "system",
      domain: job.domain ?? "system",
      priority: job.priority ?? 2,
      dedupKey: job.dedupKey ?? null,
      aggregationKey: job.aggregationKey ?? null,
    },
  };
}

/** OS notification tag — prefers dedup_key for collapse (P17-9-2). */
export function buildPushNotificationTag(
  data: PushNotificationPayloadData,
): string | undefined {
  if (data.dedupKey) return `d:${data.dedupKey}`.slice(0, 128);
  if (data.notificationId) return `n:${data.notificationId}`;
  return undefined;
}

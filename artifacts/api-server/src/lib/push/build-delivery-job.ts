import type { PreparedInAppNotification } from "../jobs/notification-types";
import { buildNotificationInsertValues } from "../notifications/insert-values";
import { notificationDeepLinkPath } from "../notifications/deep-link";
import type { PushDeliveryJob } from "./push-queue";

export function buildPushDeliveryJob(
  input: PreparedInAppNotification,
  notificationId: number,
): PushDeliveryJob {
  const values = buildNotificationInsertValues(input);
  return {
    userId: input.userId,
    notificationId,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    dedupKey: values.dedupKey ?? null,
    aggregationKey: values.aggregationKey ?? null,
    category: values.category,
    domain: values.domain,
    priority: values.priority,
    deepLinkPath:
      input.foundation?.deepLinkPath ??
      notificationDeepLinkPath({
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      }),
  };
}

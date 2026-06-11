import type { NotificationInsert } from "@workspace/db";
import type { PreparedInAppNotification } from "../jobs/notification-types";
import { resolveNotificationFoundation } from "./foundation";
import type { NotificationFoundationFields } from "./types";

export function resolvePersistedFoundation(
  input: PreparedInAppNotification,
): NotificationFoundationFields {
  if (input.foundation) return input.foundation;
  return resolveNotificationFoundation({
    userId: input.userId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

export function buildNotificationInsertValues(
  input: PreparedInAppNotification,
): NotificationInsert {
  const foundation = resolvePersistedFoundation(input);
  return {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? undefined,
    dedupKey: foundation.dedupKey,
    aggregationKey: foundation.aggregationKey,
    priority: foundation.priority,
    category: foundation.category,
    domain: foundation.domain,
  };
}

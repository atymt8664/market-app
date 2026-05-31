import { executeInsertInAppNotification } from "./notification-persist";
import { prepareInAppNotification } from "./notification-prepare";
import {
  dispatchInAppNotification,
  isNotificationOutboxEnabled,
} from "./notification-outbox";
import type { CreateNotificationInput } from "./jobs/notification-types";

export type { CreateNotificationInput } from "./jobs/notification-types";

/**
 * Creates an in-app notification (sync insert or STAGING outbox enqueue).
 * Returns notification id when sync insert succeeds; null when gated, async enqueued, or invalid.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<number | null> {
  const prepared = await prepareInAppNotification(input);
  if (!prepared) return null;

  if (isNotificationOutboxEnabled()) {
    await dispatchInAppNotification(prepared);
    return null;
  }

  return executeInsertInAppNotification(prepared);
}

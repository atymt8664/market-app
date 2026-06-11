import { eq } from "drizzle-orm";
import { db, notificationPreferencesTable } from "@workspace/db";
import {
  resolvePreferenceColumnForType,
  type NotificationPreferenceColumn,
} from "./notifications/catalog";

type PrefColumn = Exclude<NotificationPreferenceColumn, null>;

type PrefRow = {
  notifyMessages: boolean;
  notifyAdModeration: boolean;
  notifySupport: boolean;
  notifyReports: boolean;
  notifyAnnouncements: boolean;
  notifyFavorites: boolean;
  pushEnabled: boolean;
};

async function loadPreferenceRow(userId: number): Promise<PrefRow | null> {
  const [row] = await db
    .select({
      notifyMessages: notificationPreferencesTable.notifyMessages,
      notifyAdModeration: notificationPreferencesTable.notifyAdModeration,
      notifySupport: notificationPreferencesTable.notifySupport,
      notifyReports: notificationPreferencesTable.notifyReports,
      notifyAnnouncements: notificationPreferencesTable.notifyAnnouncements,
      notifyFavorites: notificationPreferencesTable.notifyFavorites,
      pushEnabled: notificationPreferencesTable.pushEnabled,
    })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return row ?? null;
}

function categoryAllowed(row: PrefRow | null, col: PrefColumn | null): boolean {
  if (!col) return true;
  if (!row) return true;
  switch (col) {
    case "notifyMessages":
      return row.notifyMessages;
    case "notifyAdModeration":
      return row.notifyAdModeration;
    case "notifySupport":
      return row.notifySupport;
    case "notifyReports":
      return row.notifyReports;
    case "notifyAnnouncements":
      return row.notifyAnnouncements;
    case "notifyFavorites":
      return row.notifyFavorites;
    default:
      return true;
  }
}

/**
 * When no row exists, all in-app categories are enabled. Unknown notification types are always delivered.
 */
export async function shouldDeliverInAppNotification(
  userId: number,
  notificationType: string,
): Promise<boolean> {
  if (!Number.isInteger(userId) || userId <= 0) return false;
  const col = resolvePreferenceColumnForType(notificationType);
  const row = await loadPreferenceRow(userId);
  return categoryAllowed(row, col);
}

/** Device push uses the same category toggles plus master pushEnabled. */
export async function shouldDeliverPushNotification(
  userId: number,
  notificationType: string,
): Promise<boolean> {
  if (!Number.isInteger(userId) || userId <= 0) return false;
  const row = await loadPreferenceRow(userId);
  if (row && !row.pushEnabled) return false;
  const col = resolvePreferenceColumnForType(notificationType);
  return categoryAllowed(row, col);
}

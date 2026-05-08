import { eq } from "drizzle-orm";
import { db, notificationPreferencesTable } from "@workspace/db";

type PrefColumn =
  | "notifyMessages"
  | "notifyAdModeration"
  | "notifySupport"
  | "notifyReports"
  | "notifyAnnouncements";

function preferenceColumnForType(notificationType: string): PrefColumn | null {
  const n = notificationType.trim().toLowerCase();
  if (n.startsWith("ad.")) return "notifyAdModeration";
  if (n.startsWith("support.")) return "notifySupport";
  if (n.startsWith("report.")) return "notifyReports";
  if (n.startsWith("message.") || n.startsWith("chat.")) return "notifyMessages";
  if (n.startsWith("announcement.")) return "notifyAnnouncements";
  return null;
}

/**
 * When no row exists, all in-app categories are enabled. Unknown notification types are always delivered.
 */
export async function shouldDeliverInAppNotification(
  userId: number,
  notificationType: string,
): Promise<boolean> {
  if (!Number.isInteger(userId) || userId <= 0) return false;
  const col = preferenceColumnForType(notificationType);
  if (!col) return true;

  const [row] = await db
    .select({
      notifyMessages: notificationPreferencesTable.notifyMessages,
      notifyAdModeration: notificationPreferencesTable.notifyAdModeration,
      notifySupport: notificationPreferencesTable.notifySupport,
      notifyReports: notificationPreferencesTable.notifyReports,
      notifyAnnouncements: notificationPreferencesTable.notifyAnnouncements,
    })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);

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
    default:
      return true;
  }
}

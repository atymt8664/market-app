import { and, eq, isNull, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { computeAppBadgeTotal } from "./badge-counters";

export type UnreadCounters = {
  messages: number;
  notifications: number;
  total: number;
};

export {
  BADGE_COUNT_DISPLAY_CAP,
  clampBadgeCount,
  computeAppBadgeTotal,
  formatBadgeCount,
} from "./badge-counters";

export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  if (!Number.isInteger(userId) || userId <= 0) return 0;
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(
      and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)),
    );
  return Number(row?.c ?? 0);
}

/** Unread chat messages in non-hidden conversations for the user. */
export async function getUnreadMessagesCount(userId: number): Promise<number> {
  if (!Number.isInteger(userId) || userId <= 0) return 0;
  const result = await db.execute<{ c: number }>(sql`
    SELECT COUNT(*)::int AS c
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.buyer_id = ${userId} OR c.seller_id = ${userId})
      AND m.sender_id <> ${userId}
      AND m.read_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM conversation_hides ch
        WHERE ch.conversation_id = c.id AND ch.user_id = ${userId}
      )
  `);
  const row = result.rows[0];
  return Number(row?.c ?? 0);
}

export async function getUnreadCounters(userId: number): Promise<UnreadCounters> {
  const [messages, notifications] = await Promise.all([
    getUnreadMessagesCount(userId),
    getUnreadNotificationsCount(userId),
  ]);
  return {
    messages,
    notifications,
    total: computeAppBadgeTotal(messages, notifications),
  };
}

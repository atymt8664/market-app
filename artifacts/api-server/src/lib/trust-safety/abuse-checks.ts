import { adsTable, db, messagesTable, reportsTable, usersTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  DUPLICATE_AD_WINDOW_MS,
  DUPLICATE_MESSAGE_MAX,
  DUPLICATE_MESSAGE_WINDOW_MS,
  DUPLICATE_REPORT_WINDOW_MS,
  NEW_ACCOUNT_AGE_MS,
  NEW_ACCOUNT_MAX_ADS_PER_DAY,
  normalizeDuplicateText,
} from "./trust-limits";

export async function assertUserCanCreateAd(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.createdAt) return null;

  const accountAgeMs = Date.now() - user.createdAt.getTime();
  if (accountAgeMs >= NEW_ACCOUNT_AGE_MS) return null;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count }] = (
    await db.execute<{ count: number }>(
      sql`select count(*)::int as count from ${adsTable} where user_id = ${userId} and created_at >= ${dayAgo}`,
    )
  ).rows as Array<{ count: number }>;

  if (Number(count ?? 0) >= NEW_ACCOUNT_MAX_ADS_PER_DAY) {
    return "حساب جديد: تجاوزت حد نشر الإعلانات اليومي، حاول غداً";
  }
  return null;
}

export async function findDuplicateAd(
  userId: number,
  title: string,
  description: string,
): Promise<boolean> {
  const normalizedTitle = normalizeDuplicateText(title);
  const normalizedDescription = normalizeDuplicateText(description);
  if (!normalizedTitle) return false;

  const since = new Date(Date.now() - DUPLICATE_AD_WINDOW_MS);
  const rows = await db
    .select({ id: adsTable.id, title: adsTable.title, description: adsTable.description })
    .from(adsTable)
    .where(and(eq(adsTable.userId, userId), gte(adsTable.createdAt, since)))
    .limit(20);

  return rows.some(
    (row) =>
      normalizeDuplicateText(row.title) === normalizedTitle &&
      normalizeDuplicateText(row.description) === normalizedDescription,
  );
}

export async function findDuplicateReport(input: {
  reporterId: number;
  targetUserId: number | null;
  targetAdId: number | null;
  relatedConversationId: number | null;
  reason: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - DUPLICATE_REPORT_WINDOW_MS);
  const normalizedReason = normalizeDuplicateText(input.reason);
  const conditions = [
    eq(reportsTable.reporterId, input.reporterId),
    gte(reportsTable.createdAt, since),
  ];

  const rows = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      targetUserId: reportsTable.targetUserId,
      targetAdId: reportsTable.targetAdId,
      relatedConversationId: reportsTable.relatedConversationId,
    })
    .from(reportsTable)
    .where(and(...conditions))
    .limit(30);

  return rows.some((row) => {
    if (normalizeDuplicateText(row.reason) !== normalizedReason) return false;
    if (input.relatedConversationId != null) {
      return row.relatedConversationId === input.relatedConversationId;
    }
    if (input.targetAdId != null) {
      return row.targetAdId === input.targetAdId;
    }
    if (input.targetUserId != null) {
      return row.targetUserId === input.targetUserId;
    }
    return false;
  });
}

export async function findDuplicateMessage(
  senderId: number,
  conversationId: number,
  body: string,
): Promise<boolean> {
  const normalizedBody = normalizeDuplicateText(body);
  if (!normalizedBody) return false;

  const since = new Date(Date.now() - DUPLICATE_MESSAGE_WINDOW_MS);
  const [{ count }] = (
    await db.execute<{ count: number }>(
      sql`
        select count(*)::int as count
        from ${messagesTable}
        where sender_id = ${senderId}
          and conversation_id = ${conversationId}
          and created_at >= ${since}
          and lower(trim(regexp_replace(body, '\\s+', ' ', 'g'))) = ${normalizedBody}
      `,
    )
  ).rows as Array<{ count: number }>;

  return Number(count ?? 0) >= DUPLICATE_MESSAGE_MAX;
}

import {
  db,
  usersTable,
  adsTable,
  messagesTable,
  reportsTable,
  notificationsTable,
  adFavoritesTable,
  adLikesTable,
  messageHidesTable,
  conversationHidesTable,
  supportTicketsTable,
} from "@workspace/db";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  removeUploadsObjectsByPaths,
  tryParseUploadsObjectPathFromPublicUrl,
} from "./supabaseStorage";
import { logger } from "./logger";

function collectPathsFromAdImagesJson(images: unknown): string[] {
  const out: string[] = [];
  if (!Array.isArray(images)) return out;
  for (const item of images) {
    if (typeof item === "string") {
      const p = tryParseUploadsObjectPathFromPublicUrl(item);
      if (p) out.push(p);
    } else if (item && typeof item === "object" && "url" in item) {
      const u = (item as { url?: unknown }).url;
      if (typeof u === "string") {
        const p = tryParseUploadsObjectPathFromPublicUrl(u);
        if (p) out.push(p);
      }
    }
  }
  return out;
}

export async function collectUploadsPathsForUserAccount(userId: number): Promise<string[]> {
  const paths: string[] = [];

  const [userRow] = await db
    .select({ avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (userRow?.avatarUrl) {
    const p = tryParseUploadsObjectPathFromPublicUrl(userRow.avatarUrl);
    if (p) paths.push(p);
  }

  const adRows = await db
    .select({ images: adsTable.images })
    .from(adsTable)
    .where(eq(adsTable.userId, userId));

  for (const row of adRows) {
    paths.push(...collectPathsFromAdImagesJson(row.images));
  }

  const messageRows = await db
    .select({ imageUrl: messagesTable.imageUrl })
    .from(messagesTable)
    .where(and(eq(messagesTable.senderId, userId), isNotNull(messagesTable.imageUrl)));

  for (const row of messageRows) {
    if (row.imageUrl) {
      const p = tryParseUploadsObjectPathFromPublicUrl(row.imageUrl);
      if (p) paths.push(p);
    }
  }

  return [...new Set(paths)];
}

/**
 * Deletes the user row and dependent data in a single transaction.
 * Reports without FK to users are cleaned explicitly; `user_sessions` cleared by SQL.
 * Admin activity logs are not modified (may still reference numeric target ids).
 */
export async function deleteUserAccountInTransaction(userId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [stillThere] = await tx
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!stillThere) {
      return false;
    }

    await tx.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
    await tx.delete(adFavoritesTable).where(eq(adFavoritesTable.userId, userId));
    await tx.delete(adLikesTable).where(eq(adLikesTable.userId, userId));
    await tx.delete(messageHidesTable).where(eq(messageHidesTable.userId, userId));
    await tx.delete(conversationHidesTable).where(eq(conversationHidesTable.userId, userId));

    await tx.delete(reportsTable).where(eq(reportsTable.reporterId, userId));
    await tx.update(reportsTable).set({ targetUserId: null }).where(eq(reportsTable.targetUserId, userId));

    const userAdIdRows = await tx
      .select({ id: adsTable.id })
      .from(adsTable)
      .where(eq(adsTable.userId, userId));
    const adIds = userAdIdRows.map((r) => r.id);
    if (adIds.length > 0) {
      await tx.update(reportsTable).set({ targetAdId: null }).where(inArray(reportsTable.targetAdId, adIds));
    }

    await tx.delete(supportTicketsTable).where(eq(supportTicketsTable.userId, userId));

    await tx.execute(
      sql`delete from user_sessions where sess::jsonb->>'userId' = ${String(userId)}`,
    );

    const deleted = await tx.delete(usersTable).where(eq(usersTable.id, userId)).returning({ id: usersTable.id });
    return deleted.length > 0;
  });
}

export async function runBestEffortStorageCleanupForUser(userId: number, paths: string[]): Promise<void> {
  try {
    await removeUploadsObjectsByPaths(paths);
  } catch (err) {
    logger.warn(
      { err, userId, pathCount: paths.length },
      "account deletion: storage cleanup failed after DB delete",
    );
  }
}

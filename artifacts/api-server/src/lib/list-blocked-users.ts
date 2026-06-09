import { db, usersTable, userBlocksTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import type { Response } from "express";
import { resolvePublicAvatarUrl } from "./trust-safety/avatar-moderation";
import {
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "./pagination";

export async function listBlockedUsersForMe(
  me: number,
  query: Record<string, unknown>,
  res: Response,
): Promise<void> {
  try {
    const pagination = parsePaginationQuery(query, PAGINATION.SOCIAL);
    const rows = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        city: usersTable.city,
        avatarUrl: usersTable.avatarUrl,
        avatarApprovedUrl: usersTable.avatarApprovedUrl,
        avatarPendingReview: usersTable.avatarPendingReview,
        blockedAt: userBlocksTable.createdAt,
        blockId: userBlocksTable.id,
      })
      .from(userBlocksTable)
      .innerJoin(usersTable, eq(usersTable.id, userBlocksTable.blockedId))
      .where(
        and(
          eq(userBlocksTable.blockerId, me),
          pagination.cursor
            ? keysetWhereDesc(
                userBlocksTable.createdAt,
                userBlocksTable.id,
                pagination.cursor,
              )
            : undefined,
        ),
      )
      .orderBy(desc(userBlocksTable.createdAt), desc(userBlocksTable.id))
      .limit(pagination.fetchLimit);
    const { items, meta } = finalizePage(rows, pagination.limit, (r) => ({
      at: r.blockedAt,
      id: r.blockId,
    }));
    sendJsonArrayPage(
      res,
      items.map((r) => ({
        id: r.userId,
        name: r.name,
        city: r.city,
        avatarUrl: resolvePublicAvatarUrl(
          {
            avatarUrl: r.avatarUrl,
            avatarApprovedUrl: r.avatarApprovedUrl,
            avatarPendingReview: r.avatarPendingReview,
          },
          false,
        ),
        blockedAt:
          r.blockedAt instanceof Date ? r.blockedAt.toISOString() : String(r.blockedAt),
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
}

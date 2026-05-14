import { db, userBlocksTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

/** True if either user has blocked the other (symmetric). */
export async function eitherUserBlocksTheOther(userA: number, userB: number): Promise<boolean> {
  const rows = await db
    .select({ id: userBlocksTable.id })
    .from(userBlocksTable)
    .where(
      or(
        and(eq(userBlocksTable.blockerId, userA), eq(userBlocksTable.blockedId, userB)),
        and(eq(userBlocksTable.blockerId, userB), eq(userBlocksTable.blockedId, userA)),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

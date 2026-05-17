import {
  db,
  adLikesTable,
  adFavoritesTable,
  adReactionCountsTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { counterMapsFromRows } from "./ad-reaction-counts-util";

export { clampCounter, counterMapsFromRows } from "./ad-reaction-counts-util";

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Enable after 013 migration + backfill verified on target DB. */
export function useDenormalizedReactionCounters(): boolean {
  return process.env.USE_DENORMALIZED_REACTION_COUNTERS === "1";
}

export async function fetchDenormalizedCounterMaps(pageIds: number[]): Promise<{
  likeCountByAdId: Map<number, number>;
  favoriteCountByAdId: Map<number, number>;
}> {
  if (pageIds.length === 0) {
    return { likeCountByAdId: new Map(), favoriteCountByAdId: new Map() };
  }
  const rows = await db
    .select({
      adId: adReactionCountsTable.adId,
      likeCount: adReactionCountsTable.likeCount,
      favoriteCount: adReactionCountsTable.favoriteCount,
    })
    .from(adReactionCountsTable)
    .where(inArray(adReactionCountsTable.adId, pageIds));
  return counterMapsFromRows(rows);
}

export async function ensureCounterRow(
  adId: number,
  tx: DbExecutor = db,
): Promise<void> {
  await tx
    .insert(adReactionCountsTable)
    .values({ adId, likeCount: 0, favoriteCount: 0 })
    .onConflictDoNothing({ target: adReactionCountsTable.adId });
}

export type ReactionKind = "like" | "favorite";

async function membershipActive(
  kind: ReactionKind,
  adId: number,
  userId: number,
  tx: DbExecutor,
): Promise<boolean> {
  const table = kind === "like" ? adLikesTable : adFavoritesTable;
  const rows = await tx
    .select({ adId: table.adId })
    .from(table)
    .where(and(eq(table.adId, adId), eq(table.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function readCounter(
  kind: ReactionKind,
  adId: number,
  tx: DbExecutor,
): Promise<number> {
  const col =
    kind === "like"
      ? adReactionCountsTable.likeCount
      : adReactionCountsTable.favoriteCount;
  const rows = await tx
    .select({ c: col })
    .from(adReactionCountsTable)
    .where(eq(adReactionCountsTable.adId, adId))
    .limit(1);
  return Number(rows[0]?.c ?? 0);
}

/**
 * Atomic like/favorite toggle with denormalized counter maintenance.
 * Idempotent: duplicate like/favorite does not double-increment (ON CONFLICT / no-op delete).
 */
export async function applyReactionToggle(params: {
  kind: ReactionKind;
  adId: number;
  userId: number;
  action: "add" | "remove";
}): Promise<{ count: number; active: boolean }> {
  const { kind, adId, userId, action } = params;
  const membershipTable = kind === "like" ? adLikesTable : adFavoritesTable;
  return db.transaction(async (tx) => {
    await ensureCounterRow(adId, tx);

    if (action === "add") {
      const inserted = await tx
        .insert(membershipTable)
        .values({ adId, userId })
        .onConflictDoNothing({
          target: [membershipTable.adId, membershipTable.userId],
        })
        .returning({ adId: membershipTable.adId });
      if (inserted.length > 0) {
        if (kind === "like") {
          await tx
            .update(adReactionCountsTable)
            .set({
              likeCount: sql`${adReactionCountsTable.likeCount} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(adReactionCountsTable.adId, adId));
        } else {
          await tx
            .update(adReactionCountsTable)
            .set({
              favoriteCount: sql`${adReactionCountsTable.favoriteCount} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(adReactionCountsTable.adId, adId));
        }
      }
    } else {
      const removed = await tx
        .delete(membershipTable)
        .where(
          and(eq(membershipTable.adId, adId), eq(membershipTable.userId, userId)),
        )
        .returning({ adId: membershipTable.adId });
      if (removed.length > 0) {
        if (kind === "like") {
          await tx
            .update(adReactionCountsTable)
            .set({
              likeCount: sql`GREATEST(0, ${adReactionCountsTable.likeCount} - 1)`,
              updatedAt: sql`now()`,
            })
            .where(eq(adReactionCountsTable.adId, adId));
        } else {
          await tx
            .update(adReactionCountsTable)
            .set({
              favoriteCount: sql`GREATEST(0, ${adReactionCountsTable.favoriteCount} - 1)`,
              updatedAt: sql`now()`,
            })
            .where(eq(adReactionCountsTable.adId, adId));
        }
      }
    }

    const count = await readCounter(kind, adId, tx);
    const active = await membershipActive(kind, adId, userId, tx);
    return { count, active };
  });
}

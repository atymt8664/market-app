import {
  adsTable,
  conversationAdReferencesTable,
  conversationsTable,
  conversationDeletesTable,
  messageHidesTable,
  messagesTable,
  db,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { isPublicListingStatus } from "./ad-lifecycle";

export type SerializedConversationAdRef = {
  adId: number;
  title: string;
  imageUrl: string | null;
  price: number | null;
  priceType: string | null;
  available: boolean;
  status: string | null;
};

export async function findBuyerSellerConversation(
  buyerId: number,
  sellerId: number,
) {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.buyerId, buyerId),
        eq(conversationsTable.sellerId, sellerId),
      ),
    )
    .orderBy(desc(conversationsTable.lastMessageAt), desc(conversationsTable.id))
    .limit(1);
  return rows[0] ?? null;
}

/** All conversation rows for a buyer/seller pair (legacy pre-consolidation duplicates). */
export async function listConversationIdsForBuyerSellerPair(
  buyerId: number,
  sellerId: number,
): Promise<number[]> {
  const rows = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.buyerId, buyerId),
        eq(conversationsTable.sellerId, sellerId),
      ),
    );
  return rows.map((r) => r.id);
}

export async function ensureConversationAdReference(
  conversationId: number,
  adId: number,
): Promise<void> {
  await db
    .insert(conversationAdReferencesTable)
    .values({ conversationId, adId })
    .onConflictDoNothing();
}

function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (typeof cur === "object" && cur !== null && "code" in cur) {
      if (String((cur as { code?: string }).code) === "23505") return true;
    }
    cur =
      typeof cur === "object" && cur !== null && "cause" in cur
        ? (cur as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}

/** Best-effort primary ad pointer; skip when legacy (ad_id, buyer_id) unique would reject the update. */
export async function touchConversationPrimaryAd(
  conversationId: number,
  adId: number,
): Promise<void> {
  const convRows = await db
    .select({ buyerId: conversationsTable.buyerId, adId: conversationsTable.adId })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);
  const conv = convRows[0];
  if (!conv || conv.adId === adId) return;

  const conflict = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.adId, adId),
        eq(conversationsTable.buyerId, conv.buyerId),
        ne(conversationsTable.id, conversationId),
      ),
    )
    .limit(1);
  if (conflict[0]) return;

  try {
    await db
      .update(conversationsTable)
      .set({ adId })
      .where(eq(conversationsTable.id, conversationId));
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return;
    throw err;
  }
}

export async function loadConversationAdReferences(
  conversationId: number,
): Promise<SerializedConversationAdRef[]> {
  const rows = await db
    .select({
      adId: conversationAdReferencesTable.adId,
      title: adsTable.title,
      images: adsTable.images,
      price: adsTable.price,
      priceType: adsTable.priceType,
      status: adsTable.status,
    })
    .from(conversationAdReferencesTable)
    .innerJoin(adsTable, eq(adsTable.id, conversationAdReferencesTable.adId))
    .where(eq(conversationAdReferencesTable.conversationId, conversationId))
    .orderBy(asc(conversationAdReferencesTable.createdAt), asc(conversationAdReferencesTable.adId));

  return rows.map((row) => {
    const images = Array.isArray(row.images) ? (row.images as string[]) : [];
    return {
      adId: row.adId,
      title: row.title,
      imageUrl: images[0] ?? null,
      price: row.price != null ? Number(row.price) : null,
      priceType: row.priceType ?? null,
      available: isPublicListingStatus(row.status),
      status: row.status ?? null,
    };
  });
}

export async function conversationHasAdReference(
  conversationId: number,
  adId: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: conversationAdReferencesTable.id })
    .from(conversationAdReferencesTable)
    .where(
      and(
        eq(conversationAdReferencesTable.conversationId, conversationId),
        eq(conversationAdReferencesTable.adId, adId),
      ),
    )
    .limit(1);
  return !!rows[0];
}

export async function loadAdReferencePayload(adId: number) {
  const rows = await db.select().from(adsTable).where(eq(adsTable.id, adId)).limit(1);
  const ad = rows[0];
  if (!ad) return null;
  const images = Array.isArray(ad.images) ? (ad.images as string[]) : [];
  return {
    adId: ad.id,
    title: ad.title,
    price: ad.price != null ? Number(ad.price) : null,
    priceType: ad.priceType ?? null,
    imageUrl: images[0] ?? null,
  };
}

/**
 * After delete-for-me, reopening from a new ad must not resurrect old messages or ad cards
 * for the user who deleted. Keeps one conversation row per buyer/seller pair (P5 consolidation).
 */
export async function reopenConversationFreshStartForUser(
  userId: number,
  buyerId: number,
  sellerId: number,
): Promise<boolean> {
  const pairIds = await listConversationIdsForBuyerSellerPair(buyerId, sellerId);
  if (!pairIds.length) return false;

  const deleteRows = await db
    .select({ conversationId: conversationDeletesTable.conversationId })
    .from(conversationDeletesTable)
    .where(
      and(
        eq(conversationDeletesTable.userId, userId),
        inArray(conversationDeletesTable.conversationId, pairIds),
      ),
    );
  if (!deleteRows.length) return false;

  await db.transaction(async (tx) => {
    await tx
      .delete(conversationDeletesTable)
      .where(
        and(
          eq(conversationDeletesTable.userId, userId),
          inArray(conversationDeletesTable.conversationId, pairIds),
        ),
      );

    for (const convId of pairIds) {
      const msgRows = await tx
        .select({ id: messagesTable.id })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId));
      for (const msg of msgRows) {
        await tx
          .insert(messageHidesTable)
          .values({ userId, messageId: msg.id })
          .onConflictDoNothing();
      }
    }
  });

  return true;
}

/** When a user has no visible messages, only expose the primary ad in referencedAds (fresh thread). */
export async function filterReferencedAdsForViewer(
  userId: number,
  conversationId: number,
  primaryAdId: number,
  refs: SerializedConversationAdRef[],
): Promise<SerializedConversationAdRef[]> {
  const [{ count }] = (
    await db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from messages m
      where m.conversation_id = ${conversationId}
        and not exists (
          select 1 from message_hides h
          where h.user_id = ${userId} and h.message_id = m.id
        )
    `)
  ).rows as Array<{ count: number }>;

  if (Number(count ?? 0) === 0) {
    const newestRef = refs.length > 0 ? refs[refs.length - 1] : null;
    const preferredAdId = newestRef?.adId ?? primaryAdId;
    const primary = refs.filter((r) => r.adId === preferredAdId);
    if (primary.length > 0) return primary;
    return refs.slice(0, 1);
  }

  return refs;
}

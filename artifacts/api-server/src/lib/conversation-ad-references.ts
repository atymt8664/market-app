import {
  adsTable,
  conversationAdReferencesTable,
  conversationsTable,
  db,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { isPublicAdStatus } from "./ad-visibility";

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

export async function ensureConversationAdReference(
  conversationId: number,
  adId: number,
): Promise<void> {
  await db
    .insert(conversationAdReferencesTable)
    .values({ conversationId, adId })
    .onConflictDoNothing();
}

export async function touchConversationPrimaryAd(
  conversationId: number,
  adId: number,
): Promise<void> {
  await db
    .update(conversationsTable)
    .set({ adId })
    .where(eq(conversationsTable.id, conversationId));
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
      available: isPublicAdStatus(row.status),
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

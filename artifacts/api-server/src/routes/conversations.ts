import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, adsTable, usersTable } from "@workspace/db";
import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { broadcastToUser, isUserFocusedOnConversation } from "../lib/realtime";
import { isPublicAdStatus } from "../lib/ad-visibility";

const router: IRouter = Router();

function serializeMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

router.post("/conversations", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const adId = Number((req.body as { adId?: unknown })?.adId);
  if (!Number.isInteger(adId) || adId <= 0) {
    res.status(400).json({ error: "adId مطلوب" });
    return;
  }
  const adRows = await db.select().from(adsTable).where(eq(adsTable.id, adId)).limit(1);
  const ad = adRows[0];
  if (!ad) {
    res.status(404).json({ error: "الإعلان غير موجود" });
    return;
  }
  if (!ad.userId) {
    res.status(400).json({ error: "لا يمكن مراسلة هذا الإعلان" });
    return;
  }
  if (ad.userId === userId) {
    res.status(400).json({ error: "لا يمكنك مراسلة إعلانك" });
    return;
  }
  if (!isPublicAdStatus(ad.status)) {
    res.status(400).json({ error: "لا يمكن مراسلة هذا الإعلان" });
    return;
  }
  const sellerId = ad.userId;

  const existingFirst = await db
    .select({
      id: conversationsTable.id,
      hasPreview: conversationsTable.lastMessagePreview,
    })
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.adId, adId),
        eq(conversationsTable.buyerId, userId),
      ),
    )
    .limit(1);
  if (existingFirst[0]) {
    res.json({ id: existingFirst[0].id });
    return;
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [conv] = await tx
        .insert(conversationsTable)
        .values({
          adId,
          buyerId: userId,
          sellerId,
        })
        .returning();
      return conv!;
    });
    res.status(201).json({ id: created.id });
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "23505") {
      const again = await db
        .select({ id: conversationsTable.id })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.adId, adId),
            eq(conversationsTable.buyerId, userId),
          ),
        )
        .limit(1);
      if (again[0]) {
        res.json({ id: again[0].id });
        return;
      }
    }
    throw err;
  }
});

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const buyer = sql`coalesce(buyer.name, '')`;
  const seller = sql`coalesce(seller.name, '')`;
  const rows = await db.execute<{
    id: number;
    ad_id: number;
    buyer_id: number;
    seller_id: number;
    last_message_at: string;
    last_message_preview: string | null;
    last_message_sender_id: number | null;
    ad_title: string;
    ad_image: string | null;
    other_id: number;
    other_name: string;
    unread_count: number;
  }>(sql`
    select c.id, c.ad_id, c.buyer_id, c.seller_id,
           c.last_message_at, c.last_message_preview, c.last_message_sender_id,
           a.title as ad_title,
           (a.images::jsonb->>0) as ad_image,
           case when c.buyer_id = ${userId} then c.seller_id else c.buyer_id end as other_id,
           case when c.buyer_id = ${userId} then ${seller} else ${buyer} end as other_name,
           (select count(*)::int from messages m
              where m.conversation_id = c.id
                and m.sender_id <> ${userId}
                and m.read_at is null) as unread_count
    from conversations c
    join ads a on a.id = c.ad_id
    left join users buyer on buyer.id = c.buyer_id
    left join users seller on seller.id = c.seller_id
    where c.buyer_id = ${userId} or c.seller_id = ${userId}
    order by c.last_message_at desc
    limit 100
  `);
  const data = (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    id: Number(r["id"]),
    adId: Number(r["ad_id"]),
    adTitle: String(r["ad_title"]),
    adImage: (r["ad_image"] as string | null) ?? null,
    otherId: Number(r["other_id"]),
    otherName: String(r["other_name"]),
    lastMessageAt: r["last_message_at"] instanceof Date
      ? (r["last_message_at"] as Date).toISOString()
      : String(r["last_message_at"]),
    lastMessagePreview: (r["last_message_preview"] as string | null) ?? null,
    lastMessageSenderId: r["last_message_sender_id"] === null ? null : Number(r["last_message_sender_id"]),
    unreadCount: Number(r["unread_count"]) || 0,
  }));
  res.json(data);
});

async function loadConversation(convId: number, userId: number) {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);
  const conv = rows[0];
  if (!conv) return { error: "not_found" as const };
  if (conv.buyerId !== userId && conv.sellerId !== userId) return { error: "forbidden" as const };
  return { conv };
}

router.get("/conversations/:convId", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  if (!Number.isInteger(convId)) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  const { conv } = r;
  const adRows = await db.select().from(adsTable).where(eq(adsTable.id, conv.adId)).limit(1);
  const ad = adRows[0];
  const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  const otherRows = await db.select().from(usersTable).where(eq(usersTable.id, otherId)).limit(1);
  res.json({
    id: conv.id,
    adId: conv.adId,
    adTitle: ad?.title ?? "",
    adImage: ad ? ((ad.images as string[])[0] ?? null) : null,
    adPrice: ad && ad.price !== null ? Number(ad.price) : null,
    adPriceType: ad?.priceType ?? null,
    otherId,
    otherName: otherRows[0]?.name ?? "",
    isSeller: conv.sellerId === userId,
  });
});

router.get("/conversations/:convId/messages", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  // Recipient has opened the thread: mark incoming messages as delivered, then read.
  await db
    .update(messagesTable)
    .set({ deliveredAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        ne(messagesTable.senderId, userId),
        isNull(messagesTable.deliveredAt),
      ),
    );
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        ne(messagesTable.senderId, userId),
        isNull(messagesTable.readAt),
      ),
    );
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(asc(messagesTable.createdAt))
    .limit(200);
  res.json(rows.map(serializeMessage));
});

router.post("/conversations/:convId/messages", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const body = String((req.body as { body?: unknown })?.body ?? "").trim();
  if (!body) {
    res.status(400).json({ error: "الرسالة فارغة" });
    return;
  }
  if (body.length > 2000) {
    res.status(400).json({ error: "الرسالة طويلة جداً" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  const { conv } = r;
  const recipient = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  const now = new Date();
  const deliverToRecipient = isUserFocusedOnConversation(recipient, convId);
  const [created] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      senderId: userId,
      body,
      ...(deliverToRecipient ? { deliveredAt: now } : {}),
    })
    .returning();
  await db
    .update(conversationsTable)
    .set({
      lastMessageAt: created!.createdAt,
      lastMessagePreview: body.slice(0, 200),
      lastMessageSenderId: userId,
    })
    .where(eq(conversationsTable.id, convId));

  const payload = { type: "message", conversationId: convId, message: serializeMessage(created!) };
  broadcastToUser(recipient, payload);
  // Echo to sender's other devices too.
  broadcastToUser(userId, payload);

  res.status(201).json(serializeMessage(created!));
});

router.post("/conversations/:convId/read", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  await db
    .update(messagesTable)
    .set({ deliveredAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        ne(messagesTable.senderId, userId),
        isNull(messagesTable.deliveredAt),
      ),
    );
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        ne(messagesTable.senderId, userId),
        isNull(messagesTable.readAt),
      ),
    );
  res.status(204).end();
});

// helper imports kept for completeness
void or;
void desc;

export default router;

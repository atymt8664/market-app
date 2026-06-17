import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import {
  db,
  conversationsTable,
  conversationAdReferencesTable,
  messagesTable,
  adsTable,
  usersTable,
  messageHidesTable,
  conversationHidesTable,
  messageReactionsTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import {
  broadcastToUser,
  broadcastTypingStoppedForSender,
  isUserFocusedOnConversation,
} from "../lib/realtime";
import { logger } from "../lib/logger";
import { isPublicAdStatus } from "../lib/ad-visibility";
import { eitherUserBlocksTheOther } from "../lib/user-blocks";
import { resolvePublicAvatarUrl } from "../lib/trust-safety/avatar-moderation";
import {
  finalizePage,
  handlePaginationError,
  keysetWhereAsc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "../lib/pagination";
import {
  InvalidSupabaseServiceRoleKeyError,
  MissingSupabaseStorageConfigError,
  SupabaseStorageBucketNotFoundError,
  SupabaseStorageConnectionError,
  isTrustedChatImagePublicUrlForUser,
  uploadChatImageForUser,
} from "../lib/supabaseStorage";
import {
  CHAT_LOCATION_MESSAGE_TYPE,
  chatLocationPreviewLabel,
  isValidChatCoordinates,
  stringifyChatLocationBody,
} from "../lib/chat-location-message";
import { isValidChatReactionEmoji } from "../lib/chat-message-reaction";
import {
  CHAT_AD_REFERENCE_MESSAGE_TYPE,
  chatAdReferencePreviewLabel,
  stringifyChatAdReferenceBody,
} from "../lib/chat-ad-reference-message";
import {
  conversationHasAdReference,
  ensureConversationAdReference,
  findBuyerSellerConversation,
  loadAdReferencePayload,
  loadConversationAdReferences,
  touchConversationPrimaryAd,
} from "../lib/conversation-ad-references";
import { notifyMessageReceived } from "../lib/message-notifications";

const router: IRouter = Router();

/** أي حظر بين مستخدمين (بأي اتجاه) يمنع إنشاء محادثة جديدة وإرسال الرسائل. */
const CHAT_USER_BLOCK_FORBIDDEN_MESSAGE =
  "لا يمكن إرسال الرسائل بسبب وجود حظر بين المستخدمين";

const chatImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function resolveMessageType(m: typeof messagesTable.$inferSelect) {
  return m.messageType === "image"
    ? "image"
    : m.messageType === CHAT_LOCATION_MESSAGE_TYPE
      ? CHAT_LOCATION_MESSAGE_TYPE
      : m.messageType === CHAT_AD_REFERENCE_MESSAGE_TYPE
        ? CHAT_AD_REFERENCE_MESSAGE_TYPE
        : "text";
}

function serializeQuotedMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    messageType: resolveMessageType(m),
    imageUrl: m.imageUrl ?? null,
    deletedForEveryoneAt: m.deletedForEveryoneAt
      ? m.deletedForEveryoneAt.toISOString()
      : null,
  };
}

function serializeMessage(
  m: typeof messagesTable.$inferSelect,
  myReaction: string | null = null,
  quotedSource?: typeof messagesTable.$inferSelect | null,
) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    messageType: resolveMessageType(m),
    imageUrl: m.imageUrl ?? null,
    deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    deletedForEveryoneAt: m.deletedForEveryoneAt
      ? m.deletedForEveryoneAt.toISOString()
      : null,
    replyToMessageId: m.replyToMessageId ?? null,
    quotedMessage: quotedSource ? serializeQuotedMessage(quotedSource) : null,
    myReaction,
    createdAt: m.createdAt.toISOString(),
  };
}

async function fetchQuotedMessagesById(
  messageIds: number[],
): Promise<Map<number, typeof messagesTable.$inferSelect>> {
  const uniqueIds = [...new Set(messageIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueIds.length) return new Map();
  const rows = await db
    .select()
    .from(messagesTable)
    .where(inArray(messagesTable.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row]));
}

async function fetchMyReactionsByMessageId(
  userId: number,
  messageIds: number[],
): Promise<Map<number, string>> {
  if (!messageIds.length) return new Map();
  const rows = await db
    .select({
      messageId: messageReactionsTable.messageId,
      emoji: messageReactionsTable.emoji,
    })
    .from(messageReactionsTable)
    .where(
      and(
        eq(messageReactionsTable.userId, userId),
        inArray(messageReactionsTable.messageId, messageIds),
      ),
    );
  return new Map(rows.map((r) => [r.messageId, r.emoji]));
}

function handleChatImageUploadError(err: unknown, res: Response): boolean {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "حجم الصورة يتجاوز الحد المسموح (5MB)" });
      return true;
    }
    res.status(400).json({ error: "ملف الصورة غير صالح" });
    return true;
  }
  return false;
}

router.post("/conversations", requireAuth, requireUserCsrf, async (req, res) => {
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

  const existingPair = await findBuyerSellerConversation(userId, sellerId);
  if (existingPair) {
    await ensureConversationAdReference(existingPair.id, adId);
    await touchConversationPrimaryAd(existingPair.id, adId);
    res.json({ id: existingPair.id });
    return;
  }

  const existingAdBuyer = await db
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
  if (existingAdBuyer[0]) {
    res.json({ id: existingAdBuyer[0].id });
    return;
  }

  if (await eitherUserBlocksTheOther(userId, sellerId)) {
    res.status(403).json({ error: CHAT_USER_BLOCK_FORBIDDEN_MESSAGE });
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
      await tx
        .insert(conversationAdReferencesTable)
        .values({ conversationId: conv!.id, adId })
        .onConflictDoNothing();
      return conv!;
    });
    res.status(201).json({ id: created.id });
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "23505") {
      const pairAgain = await findBuyerSellerConversation(userId, sellerId);
      if (pairAgain) {
        await ensureConversationAdReference(pairAgain.id, adId);
        await touchConversationPrimaryAd(pairAgain.id, adId);
        res.json({ id: pairAgain.id });
        return;
      }
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

function mapConversationListRows(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => ({
    id: Number(r["id"]),
    adId: Number(r["ad_id"]),
    adTitle: String(r["ad_title"]),
    adImage: (r["ad_image"] as string | null) ?? null,
    otherId: Number(r["other_id"]),
    otherName: String(r["other_name"]),
    lastMessageAt:
      r["last_message_at"] instanceof Date
        ? (r["last_message_at"] as Date).toISOString()
        : String(r["last_message_at"]),
    lastMessagePreview: (r["last_message_preview"] as string | null) ?? null,
    lastMessageSenderId:
      r["last_message_sender_id"] === null
        ? null
        : Number(r["last_message_sender_id"]),
    unreadCount: Number(r["unread_count"]) || 0,
  }));
}

router.get("/conversations", requireAuth, async (req, res) => {
  try {
  const userId = req.session.userId!;
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    PAGINATION.CONVERSATIONS,
  );
  const buyer = sql`coalesce(buyer.name, '')`;
  const seller = sql`coalesce(seller.name, '')`;
  const cursorFilter = pagination.cursor
    ? sql`and (last_message_at, id) < (${pagination.cursor.at}, ${pagination.cursor.id})`
    : sql``;
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
    with base as (
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
      where (c.buyer_id = ${userId} or c.seller_id = ${userId})
        and not exists (
          select 1 from conversation_hides ch
          where ch.conversation_id = c.id and ch.user_id = ${userId}
        )
    ),
    deduped as (
      select distinct on (other_id) *
      from base
      order by other_id, last_message_at desc, id desc
    )
    select * from deduped
    where 1=1
      ${cursorFilter}
    order by last_message_at desc, id desc
    limit ${pagination.fetchLimit}
  `);
  const raw = rows.rows as Array<Record<string, unknown>>;
  const { items, meta } = finalizePage(raw, pagination.limit, (r) => ({
    at:
      r["last_message_at"] instanceof Date
        ? (r["last_message_at"] as Date)
        : new Date(String(r["last_message_at"])),
    id: Number(r["id"]),
  }));
  sendJsonArrayPage(res, mapConversationListRows(items), meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/conversations/hidden", requireAuth, async (req, res) => {
  try {
  const userId = req.session.userId!;
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    PAGINATION.CONVERSATIONS,
  );
  const buyer = sql`coalesce(buyer.name, '')`;
  const seller = sql`coalesce(seller.name, '')`;
  const cursorFilter = pagination.cursor
    ? sql`and (last_message_at, id) < (${pagination.cursor.at}, ${pagination.cursor.id})`
    : sql``;
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
    with base as (
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
      where (c.buyer_id = ${userId} or c.seller_id = ${userId})
        and exists (
          select 1 from conversation_hides ch
          where ch.conversation_id = c.id and ch.user_id = ${userId}
        )
    ),
    deduped as (
      select distinct on (other_id) *
      from base
      order by other_id, last_message_at desc, id desc
    )
    select * from deduped
    where 1=1
      ${cursorFilter}
    order by last_message_at desc, id desc
    limit ${pagination.fetchLimit}
  `);
  const raw = rows.rows as Array<Record<string, unknown>>;
  const { items, meta } = finalizePage(raw, pagination.limit, (r) => ({
    at:
      r["last_message_at"] instanceof Date
        ? (r["last_message_at"] as Date)
        : new Date(String(r["last_message_at"])),
    id: Number(r["id"]),
  }));
  sendJsonArrayPage(res, mapConversationListRows(items), meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
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

async function syncConversationPreviewAfterMessageChange(convId: number): Promise<void> {
  const [last] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
    .limit(1);
  if (!last) {
    await db
      .update(conversationsTable)
      .set({
        lastMessagePreview: null,
        lastMessageSenderId: null,
      })
      .where(eq(conversationsTable.id, convId));
    return;
  }
  const preview = last.deletedForEveryoneAt
    ? "تم حذف هذه الرسالة"
    : last.messageType === "image"
      ? last.body.trim()
        ? last.body.slice(0, 200)
        : "صورة"
      : last.messageType === CHAT_LOCATION_MESSAGE_TYPE
        ? chatLocationPreviewLabel()
        : last.messageType === CHAT_AD_REFERENCE_MESSAGE_TYPE
          ? (() => {
              try {
                const parsed = JSON.parse(last.body) as { title?: string };
                return chatAdReferencePreviewLabel(
                  typeof parsed.title === "string" ? parsed.title : "",
                );
              } catch {
                return chatAdReferencePreviewLabel("");
              }
            })()
          : last.body.slice(0, 200);
  await db
    .update(conversationsTable)
    .set({
      lastMessageAt: last.createdAt,
      lastMessagePreview: preview,
      lastMessageSenderId: last.senderId,
    })
    .where(eq(conversationsTable.id, convId));
}

async function deleteMessagesForEveryoneHandler(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  const raw = req.body as { messageIds?: unknown };
  if (!Array.isArray(raw.messageIds) || raw.messageIds.length === 0) {
    res.status(400).json({ error: "messageIds مطلوب" });
    return;
  }
  const ids = [...new Set(raw.messageIds.map((x) => Number(x)))].filter(
    (n) => Number.isInteger(n) && n > 0,
  );
  if (!ids.length) {
    res.status(400).json({ error: "لا توجد معرّفات صالحة" });
    return;
  }
  const ownedRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        eq(messagesTable.senderId, userId),
        inArray(messagesTable.id, ids),
      ),
    );
  const ownedIds = ownedRows.map((row) => row.id);
  if (!ownedIds.length) {
    res.status(400).json({ error: "لا يمكن حذف رسائل ليست منك" });
    return;
  }
  const deletedAt = new Date();
  await db
    .update(messagesTable)
    .set({ deletedForEveryoneAt: deletedAt })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        inArray(messagesTable.id, ownedIds),
        isNull(messagesTable.deletedForEveryoneAt),
      ),
    );
  await syncConversationPreviewAfterMessageChange(convId);
  const { conv } = r;
  const peerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  const deletedAtIso = deletedAt.toISOString();
  const payload = {
    type: "messages_removed" as const,
    conversationId: convId,
    messageIds: ownedIds,
    deletedForEveryoneAt: deletedAtIso,
  };
  broadcastToUser(peerId, payload);
  broadcastToUser(userId, payload);
  res.json({
    ok: true,
    deletedCount: ownedIds.length,
    messageIds: ownedIds,
    deletedForEveryoneAt: deletedAtIso,
  });
}

async function hideConversationForMeHandler(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  await db
    .insert(conversationHidesTable)
    .values({ userId, conversationId: convId })
    .onConflictDoNothing();
  res.json({ ok: true });
}

async function unhideConversationForMeHandler(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  await db
    .delete(conversationHidesTable)
    .where(
      and(eq(conversationHidesTable.userId, userId), eq(conversationHidesTable.conversationId, convId)),
    );
  res.json({ ok: true });
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
  const otherUser = otherRows[0];
  const referencedAds = await loadConversationAdReferences(conv.id);
  res.json({
    id: conv.id,
    adId: conv.adId,
    adTitle: ad?.title ?? "",
    adImage: ad ? ((ad.images as string[])[0] ?? null) : null,
    adAvailable: Boolean(ad && isPublicAdStatus(ad.status)),
    adPrice: ad && ad.price !== null ? Number(ad.price) : null,
    adPriceType: ad?.priceType ?? null,
    referencedAds,
    otherId,
    otherName: otherUser?.name ?? "",
    otherAvatarUrl: otherUser
      ? resolvePublicAvatarUrl(otherUser, false)
      : null,
    isSeller: conv.sellerId === userId,
  });
});

router.get("/conversations/:convId/messages", requireAuth, async (req, res) => {
  try {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const pagination = parsePaginationQuery(
    req.query as Record<string, unknown>,
    PAGINATION.MESSAGES,
  );
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
  const hiddenRows = await db
    .select({ messageId: messageHidesTable.messageId })
    .from(messageHidesTable)
    .innerJoin(messagesTable, eq(messagesTable.id, messageHidesTable.messageId))
    .where(and(eq(messageHidesTable.userId, userId), eq(messagesTable.conversationId, convId)));
  const hiddenIds = hiddenRows.map((h) => h.messageId);
  const msgConds = [
    hiddenIds.length > 0
      ? and(eq(messagesTable.conversationId, convId), notInArray(messagesTable.id, hiddenIds))
      : eq(messagesTable.conversationId, convId),
  ];
  if (pagination.cursor) {
    msgConds.push(keysetWhereAsc(messagesTable.createdAt, messagesTable.id, pagination.cursor));
  }
  const msgWhere = and(...msgConds);
  const rows = await db
    .select()
    .from(messagesTable)
    .where(msgWhere)
    .orderBy(asc(messagesTable.createdAt), asc(messagesTable.id))
    .limit(pagination.fetchLimit);
  const { items, meta } = finalizePage(rows, pagination.limit, (m) => ({
    at: m.createdAt,
    id: m.id,
  }));
  const reactionMap = await fetchMyReactionsByMessageId(
    userId,
    items.map((m) => m.id),
  );
  const quotedMap = await fetchQuotedMessagesById(
    items.map((m) => m.replyToMessageId).filter((id): id is number => id != null),
  );
  sendJsonArrayPage(
    res,
    items.map((m) =>
      serializeMessage(
        m,
        reactionMap.get(m.id) ?? null,
        m.replyToMessageId ? quotedMap.get(m.replyToMessageId) ?? null : null,
      ),
    ),
    meta,
  );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.post(
  "/conversations/:convId/messages/upload-image",
  requireAuth,
  requireUserCsrf,
  (req: Request, res: Response, next: NextFunction) => {
    chatImageUpload.single("image")(req, res, (err: unknown) => {
      if (err && handleChatImageUploadError(err, res)) return;
      next(err);
    });
  },
  async (req, res) => {
    const userId = req.session.userId!;
    const convId = Number(req.params["convId"]);
    if (!Number.isInteger(convId) || convId <= 0) {
      res.status(400).json({ error: "معرّف غير صالح" });
      return;
    }
    const r = await loadConversation(convId, userId);
    if ("error" in r) {
      res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
      return;
    }
    const { conv } = r;
    const peerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
    if (await eitherUserBlocksTheOther(userId, peerId)) {
      res.status(403).json({ error: CHAT_USER_BLOCK_FORBIDDEN_MESSAGE });
      return;
    }
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: "يرجى اختيار صورة" });
      return;
    }
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      res.status(400).json({ error: "الملف ليس صورة صالحة" });
      return;
    }

    try {
      const imageUrl = await uploadChatImageForUser(userId, {
        buffer: file.buffer,
        mimetype: file.mimetype,
      });
      res.json({ imageUrl });
    } catch (error) {
      if (error instanceof MissingSupabaseStorageConfigError) {
        res.status(503).json({
          error: "خدمة رفع الصور غير متاحة حالياً",
          code: "SUPABASE_STORAGE_NOT_CONFIGURED",
          missingEnvVar: error.missingEnvVar,
        });
        return;
      }
      if (error instanceof InvalidSupabaseServiceRoleKeyError) {
        res.status(503).json({
          error:
            "إعداد خادم التخزين غير صحيح: استخدم مفتاح service_role من لوحة Supabase وليس مفتاح anon",
          code: "SUPABASE_SERVICE_ROLE_KEY_INVALID",
        });
        return;
      }
      if (error instanceof SupabaseStorageConnectionError) {
        const safeReason = error.message.slice(0, 280);
        res.status(503).json({
          error: "تعذر الاتصال بخدمة التخزين، يرجى المحاولة لاحقاً",
          code: "SUPABASE_STORAGE_CONNECTION_FAILED",
          reason: safeReason,
        });
        return;
      }
      if (error instanceof SupabaseStorageBucketNotFoundError) {
        const safeReason = error.message.slice(0, 280);
        res.status(503).json({
          error: "مجلد التخزين غير متاح، يرجى التحقق من إعدادات المشروع",
          code: "BUCKET_NOT_FOUND",
          reason: safeReason,
        });
        return;
      }
      const msg = error instanceof Error ? error.message : "فشل رفع الصورة";
      req.log.error({ err: error, userId, convId }, "chat image upload failed");
      res.status(400).json({ error: msg.slice(0, 280) });
    }
  },
);

router.put(
  "/conversations/:convId/messages/:messageId/reaction",
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const convId = Number(req.params["convId"]);
    const messageId = Number(req.params["messageId"]);
    const emojiRaw = (req.body as { emoji?: unknown })?.emoji;
    if (!Number.isInteger(convId) || convId <= 0) {
      res.status(400).json({ error: "معرّف المحادثة غير صالح" });
      return;
    }
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ error: "معرّف الرسالة غير صالح" });
      return;
    }
    if (!isValidChatReactionEmoji(emojiRaw)) {
      res.status(400).json({ error: "تفاعل غير صالح" });
      return;
    }
    const emoji = emojiRaw.trim();

    const r = await loadConversation(convId, userId);
    if ("error" in r) {
      res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
      return;
    }
    const { conv } = r;
    const peerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
    if (await eitherUserBlocksTheOther(userId, peerId)) {
      res.status(403).json({ error: CHAT_USER_BLOCK_FORBIDDEN_MESSAGE });
      return;
    }

    const msgRows = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.conversationId, convId)))
      .limit(1);
    const msg = msgRows[0];
    if (!msg) {
      res.status(404).json({ error: "الرسالة غير موجودة" });
      return;
    }
    if (msg.deletedForEveryoneAt) {
      res.status(400).json({ error: "لا يمكن التفاعل مع رسالة محذوفة" });
      return;
    }

    const existing = await db
      .select()
      .from(messageReactionsTable)
      .where(
        and(
          eq(messageReactionsTable.messageId, messageId),
          eq(messageReactionsTable.userId, userId),
        ),
      )
      .limit(1);
    const prev = existing[0];
    const now = new Date();

    if (prev?.emoji === emoji) {
      await db
        .delete(messageReactionsTable)
        .where(
          and(
            eq(messageReactionsTable.messageId, messageId),
            eq(messageReactionsTable.userId, userId),
          ),
        );
      res.json({ messageId, myReaction: null });
      return;
    }

    if (prev) {
      await db
        .update(messageReactionsTable)
        .set({ emoji, updatedAt: now })
        .where(
          and(
            eq(messageReactionsTable.messageId, messageId),
            eq(messageReactionsTable.userId, userId),
          ),
        );
    } else {
      await db.insert(messageReactionsTable).values({
        messageId,
        userId,
        emoji,
        createdAt: now,
        updatedAt: now,
      });
    }

    res.json({ messageId, myReaction: emoji });
  },
);

/** Specific sub-path before POST `/messages` so Express never treats it as an unknown sibling. */
router.post(
  "/conversations/:convId/messages/delete-for-everyone",
  requireAuth,
  requireUserCsrf,
  deleteMessagesForEveryoneHandler,
);

router.post("/conversations/:convId/messages", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const raw = req.body as {
    body?: unknown;
    imageUrl?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    replyToMessageId?: unknown;
    referencedAdId?: unknown;
  };
  const referencedAdId = Number(raw.referencedAdId);
  const hasReferencedAd =
    raw.referencedAdId !== undefined &&
    raw.referencedAdId !== null &&
    Number.isInteger(referencedAdId) &&
    referencedAdId > 0;
  const imageUrlRaw = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
  const body = String(raw.body ?? "").trim();
  const latNum = Number(raw.latitude);
  const lngNum = Number(raw.longitude);
  const hasLocation =
    raw.latitude !== undefined &&
    raw.longitude !== undefined &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum);

  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  const { conv } = r;

  const peerId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  if (await eitherUserBlocksTheOther(userId, peerId)) {
    res.status(403).json({ error: CHAT_USER_BLOCK_FORBIDDEN_MESSAGE });
    return;
  }

  let messageBody: string;
  let messageType:
    | "text"
    | "image"
    | typeof CHAT_LOCATION_MESSAGE_TYPE
    | typeof CHAT_AD_REFERENCE_MESSAGE_TYPE;
  let imageUrl: string | null;

  if (hasReferencedAd) {
    if (imageUrlRaw || hasLocation || body) {
      res.status(400).json({ error: "لا يمكن دمج مرجع الإعلان مع نص أو صورة أو موقع" });
      return;
    }
    const hasRef = await conversationHasAdReference(convId, referencedAdId);
    if (!hasRef) {
      res.status(400).json({ error: "هذا الإعلان غير مرتبط بهذه المحادثة" });
      return;
    }
    const payload = await loadAdReferencePayload(referencedAdId);
    if (!payload) {
      res.status(404).json({ error: "الإعلان غير موجود" });
      return;
    }
    messageBody = stringifyChatAdReferenceBody(payload);
    messageType = CHAT_AD_REFERENCE_MESSAGE_TYPE;
    imageUrl = null;
    await touchConversationPrimaryAd(convId, referencedAdId);
  } else if (hasLocation) {
    if (imageUrlRaw) {
      res.status(400).json({ error: "لا يمكن إرسال صورة وموقع في رسالة واحدة" });
      return;
    }
    if (body) {
      res.status(400).json({ error: "لا يمكن إرسال نص وموقع في رسالة واحدة" });
      return;
    }
    if (!isValidChatCoordinates(latNum, lngNum)) {
      res.status(400).json({ error: "إحداثيات الموقع غير صالحة" });
      return;
    }
    messageBody = stringifyChatLocationBody(latNum, lngNum);
    messageType = CHAT_LOCATION_MESSAGE_TYPE;
    imageUrl = null;
  } else if (imageUrlRaw) {
    if (!isTrustedChatImagePublicUrlForUser(imageUrlRaw, userId)) {
      res.status(400).json({ error: "رابط الصورة غير صالح" });
      return;
    }
    if (body.length > 2000) {
      res.status(400).json({ error: "الرسالة طويلة جداً" });
      return;
    }
    messageBody = body;
    messageType = "image";
    imageUrl = imageUrlRaw;
  } else {
    if (!body) {
      res.status(400).json({ error: "الرسالة فارغة" });
      return;
    }
    if (body.length > 2000) {
      res.status(400).json({ error: "الرسالة طويلة جداً" });
      return;
    }
    messageBody = body;
    messageType = "text";
    imageUrl = null;
  }

  let replyToMessageId: number | null = null;
  let quotedSource: typeof messagesTable.$inferSelect | null = null;
  if (raw.replyToMessageId !== undefined && raw.replyToMessageId !== null) {
    const replyId = Number(raw.replyToMessageId);
    if (!Number.isInteger(replyId) || replyId <= 0) {
      res.status(400).json({ error: "معرّف رسالة الرد غير صالح" });
      return;
    }
    const sourceRows = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.id, replyId), eq(messagesTable.conversationId, convId)))
      .limit(1);
    const source = sourceRows[0];
    if (!source) {
      res.status(400).json({ error: "رسالة الرد غير موجودة في هذه المحادثة" });
      return;
    }
    replyToMessageId = replyId;
    quotedSource = source;
  }

  const recipient = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  const now = new Date();
  const deliverToRecipient = isUserFocusedOnConversation(recipient, convId);
  const lastPreview =
    messageType === "image"
      ? (messageBody ? messageBody.slice(0, 200) : "صورة")
      : messageType === CHAT_LOCATION_MESSAGE_TYPE
        ? chatLocationPreviewLabel()
        : messageType === CHAT_AD_REFERENCE_MESSAGE_TYPE
          ? (() => {
              try {
                const parsed = JSON.parse(messageBody) as { title?: string };
                return chatAdReferencePreviewLabel(
                  typeof parsed.title === "string" ? parsed.title : "",
                );
              } catch {
                return chatAdReferencePreviewLabel("");
              }
            })()
          : messageBody.slice(0, 200);

  const [created] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      senderId: userId,
      body: messageBody,
      messageType,
      imageUrl,
      ...(replyToMessageId != null ? { replyToMessageId } : {}),
      ...(deliverToRecipient ? { deliveredAt: now } : {}),
    })
    .returning();
  await db
    .update(conversationsTable)
    .set({
      lastMessageAt: created!.createdAt,
      lastMessagePreview: lastPreview,
      lastMessageSenderId: userId,
    })
    .where(eq(conversationsTable.id, convId));

  const serialized = serializeMessage(created!, null, quotedSource);
  const payload = { type: "message", conversationId: convId, message: serialized };
  broadcastToUser(recipient, payload);
  // Echo to sender's other devices too.
  broadcastToUser(userId, payload);
  broadcastTypingStoppedForSender(convId, userId);

  if (!isUserFocusedOnConversation(recipient, convId)) {
    await notifyMessageReceived({
      recipientUserId: recipient,
      senderUserId: userId,
      conversationId: convId,
      messageId: created!.id,
    });
  }

  res.status(201).json(serialized);
});

router.post("/conversations/:convId/read", requireAuth, requireUserCsrf, async (req, res) => {
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

router.post(
  "/conversations/:convId/hide-for-me",
  requireAuth,
  requireUserCsrf,
  hideConversationForMeHandler,
);
router.post("/conversations/:convId/hide", requireAuth, requireUserCsrf, hideConversationForMeHandler);
router.delete("/conversations/:convId/hide", requireAuth, requireUserCsrf, unhideConversationForMeHandler);

router.post(
  "/conversations/:convId/unhide-for-me",
  requireAuth,
  requireUserCsrf,
  unhideConversationForMeHandler,
);

router.post("/conversations/:convId/messages/hide-for-me", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const r = await loadConversation(convId, userId);
  if ("error" in r) {
    res.status(r.error === "not_found" ? 404 : 403).json({ error: "غير مصرح" });
    return;
  }
  const raw = req.body as { messageIds?: unknown };
  if (!Array.isArray(raw.messageIds) || raw.messageIds.length === 0) {
    res.status(400).json({ error: "messageIds مطلوب" });
    return;
  }
  const ids = [...new Set(raw.messageIds.map((x) => Number(x)))].filter(
    (n) => Number.isInteger(n) && n > 0,
  );
  if (!ids.length) {
    res.status(400).json({ error: "لا توجد معرّفات صالحة" });
    return;
  }
  const validRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(and(eq(messagesTable.conversationId, convId), inArray(messagesTable.id, ids)));
  const validIds = validRows.map((row) => row.id);
  if (!validIds.length) {
    res.status(400).json({ error: "الرسائل غير موجودة في هذه المحادثة" });
    return;
  }
  await db
    .insert(messageHidesTable)
    .values(validIds.map((messageId) => ({ userId, messageId })))
    .onConflictDoNothing();
  res.json({ ok: true, hiddenCount: validIds.length });
});

export default router;

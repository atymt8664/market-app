import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import {
  db,
  conversationsTable,
  messagesTable,
  adsTable,
  usersTable,
  messageHidesTable,
  conversationHidesTable,
} from "@workspace/db";
import { and, asc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import {
  broadcastToUser,
  broadcastTypingStoppedForSender,
  isUserFocusedOnConversation,
} from "../lib/realtime";
import { isPublicAdStatus } from "../lib/ad-visibility";
import { eitherUserBlocksTheOther } from "../lib/user-blocks";
import {
  InvalidSupabaseServiceRoleKeyError,
  MissingSupabaseStorageConfigError,
  SupabaseStorageBucketNotFoundError,
  SupabaseStorageConnectionError,
  isTrustedChatImagePublicUrlForUser,
  uploadChatImageForUser,
} from "../lib/supabaseStorage";

const router: IRouter = Router();

/** أي حظر بين مستخدمين (بأي اتجاه) يمنع إنشاء محادثة جديدة وإرسال الرسائل. */
const CHAT_USER_BLOCK_FORBIDDEN_MESSAGE =
  "لا يمكن إرسال الرسائل بسبب وجود حظر بين المستخدمين";

const chatImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function serializeMessage(m: typeof messagesTable.$inferSelect) {
  const mt = m.messageType === "image" ? "image" : "text";
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    body: m.body,
    messageType: mt,
    imageUrl: m.imageUrl ?? null,
    deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
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
    where (c.buyer_id = ${userId} or c.seller_id = ${userId})
      and not exists (
        select 1 from conversation_hides ch
        where ch.conversation_id = c.id and ch.user_id = ${userId}
      )
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

router.get("/conversations/hidden", requireAuth, async (req, res) => {
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
    where (c.buyer_id = ${userId} or c.seller_id = ${userId})
      and exists (
        select 1 from conversation_hides ch
        where ch.conversation_id = c.id and ch.user_id = ${userId}
      )
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
  res.json({
    id: conv.id,
    adId: conv.adId,
    adTitle: ad?.title ?? "",
    adImage: ad ? ((ad.images as string[])[0] ?? null) : null,
    adAvailable: Boolean(ad),
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
  const hiddenRows = await db
    .select({ messageId: messageHidesTable.messageId })
    .from(messageHidesTable)
    .innerJoin(messagesTable, eq(messagesTable.id, messageHidesTable.messageId))
    .where(and(eq(messageHidesTable.userId, userId), eq(messagesTable.conversationId, convId)));
  const hiddenIds = hiddenRows.map((h) => h.messageId);
  const msgWhere =
    hiddenIds.length > 0
      ? and(eq(messagesTable.conversationId, convId), notInArray(messagesTable.id, hiddenIds))
      : eq(messagesTable.conversationId, convId);
  const rows = await db
    .select()
    .from(messagesTable)
    .where(msgWhere)
    .orderBy(asc(messagesTable.createdAt))
    .limit(200);
  res.json(rows.map(serializeMessage));
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

router.post("/conversations/:convId/messages", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const convId = Number(req.params["convId"]);
  const raw = req.body as { body?: unknown; imageUrl?: unknown };
  const imageUrlRaw = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
  const body = String(raw.body ?? "").trim();

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
  let messageType: "text" | "image";
  let imageUrl: string | null;

  if (imageUrlRaw) {
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

  const recipient = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
  const now = new Date();
  const deliverToRecipient = isUserFocusedOnConversation(recipient, convId);
  const lastPreview =
    messageType === "image"
      ? (messageBody ? messageBody.slice(0, 200) : "صورة")
      : messageBody.slice(0, 200);

  const [created] = await db
    .insert(messagesTable)
    .values({
      conversationId: convId,
      senderId: userId,
      body: messageBody,
      messageType,
      imageUrl,
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

  const payload = { type: "message", conversationId: convId, message: serializeMessage(created!) };
  broadcastToUser(recipient, payload);
  // Echo to sender's other devices too.
  broadcastToUser(userId, payload);
  broadcastTypingStoppedForSender(convId, userId);

  res.status(201).json(serializeMessage(created!));
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

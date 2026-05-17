import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  db,
  adsTable,
  adViewsTable,
  adLikesTable,
  adFavoritesTable,
  categoriesTable,
  subcategoriesTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, sql, or, inArray } from "drizzle-orm";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import crypto from "crypto";
import {
  ListAdsQueryParams,
  CreateAdBody,
  UpdateAdBody,
  GetAdParams,
} from "@workspace/api-zod";
import {
  hasValidAdminSession,
  requireAdmin,
  requireAdminAccessGrant,
  requireAdminCsrf,
} from "../middlewares/require-admin";
import { PUBLIC_AD_STATUSES, isPublicAdStatus } from "../lib/ad-visibility";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router: IRouter = Router();
let ensureAdsDetailsColumnPromise: Promise<void> | null = null;

function ensureAdsDetailsColumn() {
  if (!ensureAdsDetailsColumnPromise) {
    ensureAdsDetailsColumnPromise = db
      .execute(
        sql`alter table ads add column if not exists details jsonb not null default '{}'::jsonb`,
      )
      .then(() => undefined)
      .catch((err) => {
        ensureAdsDetailsColumnPromise = null;
        throw err;
      });
  }
  return ensureAdsDetailsColumnPromise;
}

router.use(async (_req, _res, next) => {
  try {
    await ensureAdsDetailsColumn();
    next();
  } catch (error) {
    next(error);
  }
});

router.use("/admin", requireAdminIpAllowlist);

function serializeAd(row: {
  ads: typeof adsTable.$inferSelect;
  categoryName: string | null;
  subcategoryName: string | null;
  likeCount?: number | string | null;
  favoriteCount?: number | string | null;
  isLiked?: boolean | null;
  isFavorited?: boolean | null;
}) {
  const ad = row.ads;
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    price: ad.price === null ? null : Number(ad.price),
    priceType: ad.priceType,
    type: ad.type,
    city: ad.city,
    images: (ad.images as string[]) ?? [],
    categoryId: ad.categoryId,
    subcategoryId: ad.subcategoryId,
    categoryName: row.categoryName ?? "",
    subcategoryName: row.subcategoryName,
    sellerName: ad.sellerName,
    sellerPhone: ad.sellerPhone,
    details:
      ad.details && typeof ad.details === "object"
        ? (ad.details as Record<string, unknown>)
        : {},
    featured: ad.featured,
    status: (ad as any).status,
    views: ad.views ?? 0,
    likeCount: Number(row.likeCount ?? 0),
    favoriteCount: Number(row.favoriteCount ?? 0),
    isLiked: !!row.isLiked,
    isFavorited: !!row.isFavorited,
    userId: ad.userId,
    createdAt: ad.createdAt.toISOString(),
  };
}

function viewerKeyFor(req: Parameters<typeof requireAuth>[0]): string {
  if (req.session.userId) return `u:${req.session.userId}`;
  const ip = (req.ip || req.socket.remoteAddress || "0.0.0.0")
    .split(",")[0]!
    .trim();
  const ua = req.get("user-agent") || "";
  return (
    "ip:" +
    crypto
      .createHash("sha256")
      .update(ip + "|" + ua)
      .digest("hex")
      .slice(0, 32)
  );
}

const baseSelect = (currentUserId?: number | null) =>
  db
    .select({
      ads: adsTable,
      status: adsTable.status,
      categoryName: categoriesTable.name,
      subcategoryName: subcategoriesTable.name,
      likeCount:
        sql<number>`(select count(*) from ad_likes where ad_likes.ad_id = ${adsTable.id})`.as(
          "like_count",
        ),
      favoriteCount:
        sql<number>`(select count(*) from ad_favorites where ad_favorites.ad_id = ${adsTable.id})`.as(
          "favorite_count",
        ),
      isLiked: currentUserId
        ? sql<boolean>`exists(select 1 from ad_likes where ad_likes.ad_id = ${adsTable.id} and ad_likes.user_id = ${currentUserId})`.as(
            "is_liked",
          )
        : sql<boolean>`false`.as("is_liked"),
      isFavorited: currentUserId
        ? sql<boolean>`exists(select 1 from ad_favorites where ad_favorites.ad_id = ${adsTable.id} and ad_favorites.user_id = ${currentUserId})`.as(
            "is_favorited",
          )
        : sql<boolean>`false`.as("is_favorited"),
    })
    .from(adsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, adsTable.categoryId))
    .leftJoin(
      subcategoriesTable,
      eq(subcategoriesTable.id, adsTable.subcategoryId),
    );

router.get("/ads/featured", async (req, res) => {
  const rows = await baseSelect(req.session.userId ?? null)
    .where(
      and(
        eq(adsTable.featured, true),
        inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
      ),
    )
    .orderBy(desc(adsTable.createdAt))
    .limit(10);
  res.json(rows.map(serializeAd));
});
router.get("/admin/ads", requireAdminAccessGrant, requireAdmin, async (req, res) => {
  const statusRaw = String(req.query.status ?? "").trim().toLowerCase();
  const q = (req.query.q as string | undefined)?.trim();
  const featuredRaw = req.query.featured as string | undefined;

  const clauses = [];

  /** Treat missing, "all", or unknown as no status filter (never `eq(status, "all")` — no such row). */
  const adminAdStatuses = ["pending", "approved", "rejected", "hidden"] as const;
  if (statusRaw && statusRaw !== "all" && (adminAdStatuses as readonly string[]).includes(statusRaw)) {
    clauses.push(eq(adsTable.status, statusRaw));
  }

  if (q) {
    const pattern = `%${q}%`;
    clauses.push(
      or(
        ilike(adsTable.title, pattern),
        ilike(adsTable.description, pattern),
        ilike(adsTable.city, pattern),
        ilike(adsTable.sellerName, pattern),
        ilike(adsTable.sellerPhone, pattern),
      )!,
    );
  }

  if (featuredRaw === "true") {
    clauses.push(eq(adsTable.featured, true));
  } else if (featuredRaw === "false") {
    clauses.push(eq(adsTable.featured, false));
  }

  let query: any = baseSelect(null);

  if (clauses.length > 0) {
    query = query.where(and(...clauses));
  }

  const rows = await query.orderBy(desc(adsTable.createdAt)).limit(100);

  return res.json(
    rows.map((ad: any) => ({
      ...serializeAd(ad),
      status: (ad as any).status,
    })),
  );
});

router.delete("/admin/ads/:id", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [existing] = await db
    .select({ id: adsTable.id, status: adsTable.status, userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, id))
    .limit(1);
  if (!existing) {
    return res.status(404).json({ error: "Ad not found" });
  }

  await db.delete(adsTable).where(eq(adsTable.id, id));

  if (existing.userId != null) {
    try {
      await createNotification({
        userId: existing.userId,
        type: "ad.deleted",
        title: "تم حذف إعلانك",
        body: "تم حذف إعلانك من الإدارة",
        entityType: null,
        entityId: null,
        metadata: { adId: id, source: "admin.ads.delete" },
      });
    } catch (err) {
      logger.warn({ err, adId: id }, "createNotification failed (ad.delete)");
    }
  }

  await logAdminActivity({
    action: "ad.delete",
    actorAdminId: getAdminActorId(req),
    targetType: "ad",
    targetId: id,
    details: { fromStatus: existing.status, source: "admin.ads.delete" },
  });

  return res.json({ ok: true });
});

router.get("/ads/recommended", async (req, res) => {
  const rows = await baseSelect(req.session.userId ?? null)
    .where(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]))
    .orderBy(desc(adsTable.createdAt))
    .limit(20);

  res.json(rows.map(serializeAd));
});

router.get("/ads/stats", async (_req, res) => {
  const totals = await db
    .select({
      totalAds: sql<number>`count(*)::int`,
      totalCities: sql<number>`count(distinct ${adsTable.city})::int`,
    })
    .from(adsTable)
    .where(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]));

  const totalCategories = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(categoriesTable);

  const byCategory = await db
    .select({
      categoryName: categoriesTable.name,
      count: sql<number>`count(${adsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(
      adsTable,
      and(
        eq(adsTable.categoryId, categoriesTable.id),
        inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
      ),
    )
    .groupBy(categoriesTable.id, categoriesTable.name)
    .orderBy(sql`count(${adsTable.id}) desc`)
    .limit(8);

  const byCity = await db
    .select({
      city: adsTable.city,
      count: sql<number>`count(*)::int`,
    })
    .from(adsTable)
    .where(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]))
    .groupBy(adsTable.city)
    .orderBy(sql`count(*) desc`)
    .limit(8);

  res.json({
    totalAds: totals[0]?.totalAds ?? 0,
    totalCategories: totalCategories[0]?.c ?? 0,
    totalCities: totals[0]?.totalCities ?? 0,
    byCategory,
    byCity,
  });
});

router.get("/ads/mine", requireAuth, async (req, res) => {
  const rows = await baseSelect(req.session.userId)
    .where(eq(adsTable.userId, req.session.userId!))
    .orderBy(desc(adsTable.createdAt));
  res.json(rows.map(serializeAd));
});

router.get("/ads/favorites", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const rows = await baseSelect(userId)
    .innerJoin(
      adFavoritesTable,
      and(
        eq(adFavoritesTable.adId, adsTable.id),
        eq(adFavoritesTable.userId, userId),
      ),
    )
    .where(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]))
    .orderBy(desc(adsTable.createdAt));
  res.json(rows.map(serializeAd));
});

router.get("/ads/:adId", async (req, res) => {
  const params = GetAdParams.parse({ adId: Number(req.params["adId"]) });
  const rows = await baseSelect(req.session.userId ?? null)
    .where(eq(adsTable.id, params.adId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  const st = row.ads.status;
  const uid = req.session.userId ?? null;
  const isOwner = uid !== null && row.ads.userId === uid;
  if (!isPublicAdStatus(st) && !isOwner) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  res.json(serializeAd(row));
});

router.get("/ads", async (req, res) => {
  const q = ListAdsQueryParams.parse(req.query);
  const conds = [] as ReturnType<typeof eq>[];
  conds.push(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]));
  if (q.userId !== undefined) conds.push(eq(adsTable.userId, q.userId));
  if (q.q) {
    const pat = `%${q.q}%`;
    const like = or(
      ilike(adsTable.title, pat),
      ilike(adsTable.description, pat),
    );
    if (like) conds.push(like);
  }
  if (q.categoryId !== undefined)
    conds.push(eq(adsTable.categoryId, q.categoryId));
  if (q.subcategoryId !== undefined)
    conds.push(eq(adsTable.subcategoryId, q.subcategoryId));
  if (q.city) conds.push(ilike(adsTable.city, `%${q.city}%`));
  if (q.minPrice !== undefined)
    conds.push(gte(adsTable.price, q.minPrice.toString()));
  if (q.maxPrice !== undefined)
    conds.push(lte(adsTable.price, q.maxPrice.toString()));
  if (q.type) conds.push(eq(adsTable.type, q.type));

  const where = conds.length ? and(...conds) : undefined;
  const limit = q.limit ?? 50;

  const rows = await baseSelect(req.session.userId ?? null)
    .where(where as never)
    .orderBy(desc(adsTable.createdAt))
    .limit(limit);

  res.json(rows.map(serializeAd));
});

async function reactionResponse(
  table: typeof adLikesTable | typeof adFavoritesTable,
  adId: number,
  userId: number,
) {
  const [{ count }] = (
    await db.execute<{ count: number }>(
      sql`select count(*)::int as count from ${table} where ad_id = ${adId}`,
    )
  ).rows as Array<{ count: number }>;
  const [{ active }] = (
    await db.execute<{ active: boolean }>(
      sql`select exists(select 1 from ${table} where ad_id = ${adId} and user_id = ${userId}) as active`,
    )
  ).rows as Array<{ active: boolean }>;
  return { count: Number(count ?? 0), active: !!active };
}

function parseAdId(req: Request, res: Response): number | null {
  const parsed = GetAdParams.safeParse({ adId: Number(req.params["adId"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ad id" });
    return null;
  }
  return parsed.data.adId;
}

router.post("/ads/:adId/like", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  const exists = await db
    .select({ id: adsTable.id, status: adsTable.status })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  if (!isPublicAdStatus(exists[0].status)) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  await db
    .insert(adLikesTable)
    .values({ adId, userId })
    .onConflictDoNothing({ target: [adLikesTable.adId, adLikesTable.userId] });
  res.json(await reactionResponse(adLikesTable, adId, userId));
});

router.delete("/ads/:adId/like", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  await db
    .delete(adLikesTable)
    .where(and(eq(adLikesTable.adId, adId), eq(adLikesTable.userId, userId)));
  res.json(await reactionResponse(adLikesTable, adId, userId));
});

router.post("/ads/:adId/favorite", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  const exists = await db
    .select({ id: adsTable.id, status: adsTable.status })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  if (!isPublicAdStatus(exists[0].status)) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  await db
    .insert(adFavoritesTable)
    .values({ adId, userId })
    .onConflictDoNothing({
      target: [adFavoritesTable.adId, adFavoritesTable.userId],
    });
  res.json(await reactionResponse(adFavoritesTable, adId, userId));
});

router.delete("/ads/:adId/favorite", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  await db
    .delete(adFavoritesTable)
    .where(
      and(eq(adFavoritesTable.adId, adId), eq(adFavoritesTable.userId, userId)),
    );
  res.json(await reactionResponse(adFavoritesTable, adId, userId));
});

router.post("/ads", requireAuth, requireUserCsrf, async (req, res) => {
  const body = CreateAdBody.parse(req.body);
  const rawBody = req.body as Record<string, unknown>;
  const rawDetails = rawBody["details"];
  const details =
    rawDetails && typeof rawDetails === "object" && !Array.isArray(rawDetails)
      ? (rawDetails as Record<string, unknown>)
      : {};
  const inserted = await db
    .insert(adsTable)
    .values({
      userId: req.session.userId!,
      status: "pending",
      title: body.title,
      description: body.description,
      price:
        body.price !== undefined && body.price !== null
          ? body.price.toString()
          : null,
      priceType: body.priceType,
      type: body.type,
      city: body.city,
      images: body.images ?? [],
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId ?? null,
      sellerName: body.sellerName,
      sellerPhone: body.sellerPhone,
      details,
    })
    .returning();
  const id = inserted[0]!.id;
  const rows = await baseSelect().where(eq(adsTable.id, id)).limit(1);
  res.status(201).json(serializeAd(rows[0]!));
});

router.patch("/ads/:adId", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = Number(req.params["adId"]);
  const existing = await db
    .select({ userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  const isAdminWithValidSession = hasValidAdminSession(req);
  if (existing[0].userId !== req.session.userId && !isAdminWithValidSession) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }

  const [prevRow] = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!prevRow) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  const b = req.body as Record<string, unknown>;

  const nextPrice =
    "price" in b
      ? b.price === null || b.price === undefined
        ? null
        : String(Number(b.price as number))
      : prevRow.price;

  const nextSubcategory =
    "subcategoryId" in b
      ? b.subcategoryId === null || b.subcategoryId === undefined
        ? null
        : Number(b.subcategoryId)
      : prevRow.subcategoryId;

  const nextImages =
    "images" in b && Array.isArray(b.images)
      ? (b.images as string[])
      : (prevRow.images as string[]);

  await db
    .update(adsTable)
    .set({
      title: typeof b.title === "string" ? b.title : prevRow.title,
      description:
        typeof b.description === "string" ? b.description : prevRow.description,
      price: nextPrice,
      priceType:
        typeof b.priceType === "string" ? b.priceType : prevRow.priceType,
      type: typeof b.type === "string" ? b.type : prevRow.type,
      city: typeof b.city === "string" ? b.city : prevRow.city,
      images: nextImages,
      categoryId:
        typeof b.categoryId === "number" ? b.categoryId : prevRow.categoryId,
      subcategoryId: nextSubcategory,
      sellerName:
        typeof b.sellerName === "string" ? b.sellerName : prevRow.sellerName,
      sellerPhone:
        typeof b.sellerPhone === "string" ? b.sellerPhone : prevRow.sellerPhone,
      details:
        b.details && typeof b.details === "object"
          ? (b.details as Record<string, unknown>)
          : (prevRow.details as Record<string, unknown>),
      status: prevRow.status,
    })
    .where(eq(adsTable.id, adId));

  const rows = await baseSelect(req.session.userId ?? null)
    .where(eq(adsTable.id, adId))
    .limit(1);

  res.json(serializeAd(rows[0]!));
});

router.post("/ads/:adId/view", async (req, res) => {
  const adId = Number(req.params["adId"]);
  if (!Number.isInteger(adId) || adId <= 0) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }
  const adRows = await db
    .select({ id: adsTable.id, status: adsTable.status, userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!adRows[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  const viewerId = req.session.userId ?? null;
  const isOwner =
    viewerId !== null &&
    adRows[0].userId !== null &&
    viewerId === adRows[0].userId;
  if (!isPublicAdStatus(adRows[0].status) && !isOwner) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  const key = viewerKeyFor(req);
  const inserted = await db
    .insert(adViewsTable)
    .values({ adId, viewerKey: key })
    .onConflictDoNothing({
      target: [adViewsTable.adId, adViewsTable.viewerKey],
    })
    .returning({ id: adViewsTable.id });
  if (inserted.length > 0) {
    await db
      .update(adsTable)
      .set({ views: sql`${adsTable.views} + 1` })
      .where(eq(adsTable.id, adId));
  }
  const fresh = await db
    .select({ views: adsTable.views })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  res.json({ views: fresh[0]?.views ?? 0, counted: inserted.length > 0 });
});

router.delete("/ads/:adId", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = Number(req.params["adId"]);
  if (!Number.isInteger(adId) || adId <= 0) {
    res.status(400).json({ error: "Invalid ad id" });
    return;
  }
  const existing = await db
    .select({ userId: adsTable.userId })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  if (existing[0].userId !== req.session.userId) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }
  await db.delete(adsTable).where(eq(adsTable.id, adId));
  res.status(204).end();
});

router.patch("/admin/ads/:id/status", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;

  if (typeof status !== "string" || !["approved", "rejected", "hidden"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [before] = await db
    .select({
      id: adsTable.id,
      status: adsTable.status,
      userId: adsTable.userId,
      title: adsTable.title,
    })
    .from(adsTable)
    .where(eq(adsTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "Ad not found" });
  }

  await db.update(adsTable).set({ status }).where(eq(adsTable.id, id));

  const action =
    status === "approved"
      ? before.status === "hidden"
        ? "ad.unhide"
        : "ad.approve"
      : status === "rejected"
        ? "ad.reject"
        : "ad.hide";
  await logAdminActivity({
    action,
    actorAdminId: getAdminActorId(req),
    targetType: "ad",
    targetId: id,
    details: { fromStatus: before.status, toStatus: status },
  });

  if (before.userId != null) {
    try {
      const shortTitle = before.title.trim().slice(0, 120) || "إعلانك";
      if (status === "approved") {
        await createNotification({
          userId: before.userId,
          type: "ad.approved",
          title: "تم قبول إعلانك",
          body: `تم اعتماد الإعلان: ${shortTitle}`,
          entityType: "ad",
          entityId: id,
          metadata: { adTitle: shortTitle },
        });
      } else if (status === "rejected") {
        await createNotification({
          userId: before.userId,
          type: "ad.rejected",
          title: "تم رفض إعلانك",
          body: `لم يُعتمد الإعلان: ${shortTitle}`,
          entityType: "ad",
          entityId: id,
          metadata: { adTitle: shortTitle },
        });
      } else if (status === "hidden") {
        await createNotification({
          userId: before.userId,
          type: "ad.hidden",
          title: "تم إخفاء إعلانك",
          body: "تم إخفاء إعلانك من الإدارة ولن يظهر للمستخدمين حاليًا",
          entityType: "ad",
          entityId: id,
          metadata: { adTitle: shortTitle },
        });
      }
    } catch (err) {
      logger.warn({ err, adId: id }, "createNotification failed (ad status)");
    }
  }

  return res.json({ success: true });
});

// يدوي من الأدمن فقط حالياً؛ لاحقاً يمكن ربط التفعيل بعمليات دفع/مدة (featuredUntil) دون تغيير المسار العام.
router.patch("/admin/ads/:id/featured", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const featured = req.body?.featured;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف غير صالح" });
  }
  if (typeof featured !== "boolean") {
    return res.status(400).json({ error: "القيمة featured مطلوبة (true/false)" });
  }

  const [before] = await db
    .select({
      id: adsTable.id,
      featured: adsTable.featured,
      status: adsTable.status,
      userId: adsTable.userId,
      title: adsTable.title,
    })
    .from(adsTable)
    .where(eq(adsTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "الإعلان غير موجود" });
  }

  if (featured === true && before.status !== "approved") {
    return res.status(400).json({
      error: "يمكن تمييز الإعلانات المعتمدة فقط لتظهر في الصفحة الرئيسية",
    });
  }

  if (before.featured === featured) {
    return res.json({
      ok: true,
      id,
      featured: before.featured,
      status: before.status,
    });
  }

  await db.update(adsTable).set({ featured }).where(eq(adsTable.id, id));

  await logAdminActivity({
    action: featured ? "ad.feature_on" : "ad.feature_off",
    actorAdminId: getAdminActorId(req),
    targetType: "ad",
    targetId: id,
    details: {
      featured,
      prevFeatured: before.featured,
      status: before.status,
    },
  });

  if (before.userId != null) {
    try {
      const shortTitle = before.title.trim().slice(0, 120) || "إعلانك";
      await createNotification({
        userId: before.userId,
        type: featured ? "ad.featured" : "ad.unfeatured",
        title: featured ? "تم تمييز إعلانك" : "تمت إزالة التمييز",
        body: featured
          ? `أصبح إعلانك ضمن المميزة (إن كان معتمدًا): ${shortTitle}`
          : `أُزيل التمييز عن الإعلان: ${shortTitle}`,
        entityType: "ad",
        entityId: id,
        metadata: { adTitle: shortTitle, featured },
      });
    } catch (err) {
      logger.warn({ err, adId: id }, "createNotification failed (ad featured)");
    }
  }

  const [after] = await db
    .select({
      featured: adsTable.featured,
      status: adsTable.status,
    })
    .from(adsTable)
    .where(eq(adsTable.id, id))
    .limit(1);

  return res.json({
    ok: true,
    id,
    featured: after?.featured ?? featured,
    status: after?.status ?? before.status,
  });
});

export default router;

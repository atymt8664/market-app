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
  adReactionCountsTable,
  categoriesTable,
  subcategoriesTable,
} from "@workspace/db";
import { and, desc, eq, gte, ilike, lte, sql, or, inArray } from "drizzle-orm";
import { getAdminActorId } from "../lib/admin-activity-log";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { adminDeepLink, writeAdminAudit } from "../lib/admin-audit";
import {
  assertStaffCanClaim,
  buildQueueSql,
  getDomainQueueCounts,
  mapSlaFields,
  runAutoEscalationAll,
} from "../lib/admin-operations-queue";
import { isOpsQueueKey } from "../lib/admin-operations-sla";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import {
  buildStaffAssignmentView,
  assignAd,
  claimAd,
  ensureStaffWorkflowSchema,
  releaseAd,
} from "../lib/admin-staff-workflow";
import { parseModerationReason } from "../lib/admin-moderation-reason";
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
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminFounder } from "../middlewares/require-admin-founder";
import {
  buildAdminPageMeta,
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parseAdminPageQuery,
  parsePaginationQuery,
  sanitizeQueryLimit,
  sendJsonAdminPage,
  sendJsonArrayPage,
} from "../lib/pagination";
import { fetchAdsList } from "../lib/ads-list-query";
import { buildAdSearchWhereParts, useFtsAdSearch } from "../lib/ad-search";
import { OBSERVABILITY } from "../lib/observability/config";
import { recordSearchRequest } from "../lib/observability/metrics";
import { timed } from "../lib/observability/timed";
import {
  applyReactionToggle,
  ensureCounterRow,
  useDenormalizedReactionCounters,
} from "../lib/ad-reaction-counts";
import {
  adSnapshotFromRow,
  computeAdStatusAfterUserEdit,
  shouldClearFeaturedOnReReview,
} from "../lib/trust-safety/ad-moderation";
import {
  assertUserCanCreateAd,
  findDuplicateAd,
} from "../lib/trust-safety/abuse-checks";
import { createAdLimiter } from "../lib/trust-safety/trust-limits";

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

router.get("/ads/featured", async (req, res) => {
  const rows = await fetchAdsList({
    currentUserId: req.session.userId ?? null,
    where: and(
      eq(adsTable.featured, true),
      inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
    ),
    limit: 10,
  });
  res.json(rows.map(serializeAd));
});
router.get("/admin/ads/stats", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), async (req, res) => {
  const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
  await runAutoEscalationAll();
  const counts = await getDomainQueueCounts(staff, "ads");
  return res.json(counts);
});

router.get("/admin/ads", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), async (req, res) => {
  await ensureStaffWorkflowSchema();
  const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
  await runAutoEscalationAll();

  const queueRaw = String(req.query.queue || "").trim();
  const queue = isOpsQueueKey(queueRaw) ? queueRaw : null;
  const actorId = staff.actorAdminId;

  const statusRaw = String(req.query.status ?? "").trim().toLowerCase();
  const q = (req.query.q as string | undefined)?.trim();
  const featuredRaw = req.query.featured as string | undefined;

  const clauses = [];

  if (queue && queue !== "all") {
    clauses.push(
      sql`${adsTable.id} IN (SELECT a.id FROM ads a WHERE ${buildQueueSql("ads", queue, actorId, "a")})`,
    );
  }

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

  let pageQuery;
  try {
    pageQuery = parseAdminPageQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADS_ADMIN,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
  const { page, pageSize, offset } = pageQuery;

  const whereClause = clauses.length > 0 ? and(...clauses) : undefined;

  const [countRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(adsTable)
    .where(whereClause);
  const totalItems = Number(countRow?.value ?? 0);

  const rows = await fetchAdsList({
    currentUserId: null,
    where: whereClause,
    limit: pageSize,
    offset,
  });

  const serialized = await Promise.all(
    rows.map(async (ad: any) => ({
      ...serializeAd(ad),
      status: (ad as any).status,
      assignment: await buildStaffAssignmentView({
        assignedStaffId: ad.ads.assignedStaffId ?? null,
        assignedAt: ad.ads.assignedAt ?? null,
        assignedByAdminId: ad.ads.assignedByAdminId ?? null,
      }),
      ...mapSlaFields({
        domain: "ads",
        createdAt: ad.ads.createdAt,
        slaDueAt: ad.ads.slaDueAt ?? null,
        status: String((ad as any).status ?? ad.ads.status),
        row: {
          createdAt: ad.ads.createdAt,
          updatedAt: ad.ads.updatedAt ?? null,
          status: String((ad as any).status ?? ad.ads.status),
        },
      }),
    })),
  );

  const meta = buildAdminPageMeta(page, pageSize, totalItems);

  return sendJsonAdminPage(res, serialized, meta);
});

router.delete("/admin/ads/:id", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminCsrf, async (req, res) => {
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

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "ad.delete",
    targetType: "ad",
    targetId: id,
    previousState: existing.status,
    newState: "deleted",
    deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
    extra: { source: "admin.ads.delete" },
  });

  return res.json(
    okAdminActionFeedback({
      title: "تم حذف الإعلان",
      description: `حُذف الإعلان #${id} نهائياً.`,
      nextStep: "لن يظهر للمستخدمين بعد الآن.",
      auditActivityId,
    }),
  );
});

router.get("/ads/recommended", async (req, res) => {
  const rows = await fetchAdsList({
    currentUserId: req.session.userId ?? null,
    where: inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
    limit: 20,
  });
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
  try {
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADS_MINE,
    );
    const conds = [eq(adsTable.userId, req.session.userId!)];
    if (pagination.cursor) {
      conds.push(keysetWhereDesc(adsTable.createdAt, adsTable.id, pagination.cursor));
    }
    const rows = await fetchAdsList({
      currentUserId: req.session.userId,
      where: and(...conds),
      limit: pagination.fetchLimit,
    });
    const { items, meta } = finalizePage(rows, pagination.limit, (row) => ({
      at: row.ads.createdAt,
      id: row.ads.id,
    }));
    sendJsonArrayPage(res, items.map(serializeAd), meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/ads/favorites", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADS_MINE,
    );
    const conds = [inArray(adsTable.status, [...PUBLIC_AD_STATUSES])];
    if (pagination.cursor) {
      conds.push(keysetWhereDesc(adsTable.createdAt, adsTable.id, pagination.cursor));
    }
    const rows = await fetchAdsList({
      currentUserId: userId,
      favoritesForUserId: userId,
      where: and(...conds),
      limit: pagination.fetchLimit,
    });
    const { items, meta } = finalizePage(rows, pagination.limit, (row) => ({
      at: row.ads.createdAt,
      id: row.ads.id,
    }));
    sendJsonArrayPage(res, items.map(serializeAd), meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/ads/:adId", async (req, res) => {
  const params = GetAdParams.parse({ adId: Number(req.params["adId"]) });
  const rows = await fetchAdsList({
    currentUserId: req.session.userId ?? null,
    where: eq(adsTable.id, params.adId),
    limit: 1,
  });
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
  try {
    const query = sanitizeQueryLimit(
      req.query as Record<string, unknown>,
      PAGINATION.ADS,
    );
    const q = ListAdsQueryParams.parse(query);
    const pagination = parsePaginationQuery(query, PAGINATION.ADS);
    const conds = [] as ReturnType<typeof eq>[];
    conds.push(inArray(adsTable.status, [...PUBLIC_AD_STATUSES]));
    if (q.userId !== undefined) conds.push(eq(adsTable.userId, q.userId));

    const { textSearch, extraConditions } = buildAdSearchWhereParts({
      q: q.q,
      city: q.city,
    });
    for (const c of extraConditions) conds.push(c);

    if (q.categoryId !== undefined)
      conds.push(eq(adsTable.categoryId, q.categoryId));
    if (q.subcategoryId !== undefined)
      conds.push(eq(adsTable.subcategoryId, q.subcategoryId));
    if (q.minPrice !== undefined)
      conds.push(gte(adsTable.price, q.minPrice.toString()));
    if (q.maxPrice !== undefined)
      conds.push(lte(adsTable.price, q.maxPrice.toString()));
    if (q.type) conds.push(eq(adsTable.type, q.type));
    if (pagination.cursor && !textSearch) {
      conds.push(keysetWhereDesc(adsTable.createdAt, adsTable.id, pagination.cursor));
    }

    const where = conds.length ? and(...conds) : undefined;
    const searchQuery = q.q?.trim() ?? "";

    const { result: rows, durationMs: listDurationMs } = await timed(() =>
      fetchAdsList({
        currentUserId: req.session.userId ?? null,
        where,
        limit: pagination.fetchLimit,
        textSearch,
        searchCursor: textSearch ? pagination.cursor : null,
      }),
    );

    if (searchQuery.length > 0) {
      const searchMode = textSearch ? (useFtsAdSearch() ? "fts" : "ilike") : "none";
      recordSearchRequest({
        durationMs: listDurationMs,
        resultCount: rows.length,
        mode: searchMode,
        queryLength: searchQuery.length,
      });
      if (listDurationMs >= OBSERVABILITY.slowSearchMs) {
        logger.warn(
          {
            requestId: req.id,
            durationMs: Math.round(listDurationMs),
            searchMode,
            queryLength: searchQuery.length,
            resultCount: rows.length,
          },
          "slow ad search",
        );
      }
    }

    const { items, meta } = finalizePage(rows, pagination.limit, (row) => ({
      at: row.ads.createdAt,
      id: row.ads.id,
      ...(textSearch && row.searchRank !== undefined
        ? { r: row.searchRank }
        : {}),
    }));
    sendJsonArrayPage(res, items.map(serializeAd), meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

async function reactionResponse(
  kind: "like" | "favorite",
  table: typeof adLikesTable | typeof adFavoritesTable,
  adId: number,
  userId: number,
) {
  if (useDenormalizedReactionCounters()) {
    const col =
      kind === "like"
        ? adReactionCountsTable.likeCount
        : adReactionCountsTable.favoriteCount;
    const [counter] = await db
      .select({ c: col })
      .from(adReactionCountsTable)
      .where(eq(adReactionCountsTable.adId, adId))
      .limit(1);
    const [{ active }] = (
      await db.execute<{ active: boolean }>(
        sql`select exists(select 1 from ${table} where ad_id = ${adId} and user_id = ${userId}) as active`,
      )
    ).rows as Array<{ active: boolean }>;
    return { count: Number(counter?.c ?? 0), active: !!active };
  }
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
  if (useDenormalizedReactionCounters()) {
    res.json(
      await applyReactionToggle({ kind: "like", adId, userId, action: "add" }),
    );
    return;
  }
  await db
    .insert(adLikesTable)
    .values({ adId, userId })
    .onConflictDoNothing({ target: [adLikesTable.adId, adLikesTable.userId] });
  res.json(await reactionResponse("like", adLikesTable, adId, userId));
});

router.delete("/ads/:adId/like", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  if (useDenormalizedReactionCounters()) {
    res.json(
      await applyReactionToggle({
        kind: "like",
        adId,
        userId,
        action: "remove",
      }),
    );
    return;
  }
  await db
    .delete(adLikesTable)
    .where(and(eq(adLikesTable.adId, adId), eq(adLikesTable.userId, userId)));
  res.json(await reactionResponse("like", adLikesTable, adId, userId));
});

router.post("/ads/:adId/favorite", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  const [adRow] = await db
    .select({ id: adsTable.id, status: adsTable.status, userId: adsTable.userId, title: adsTable.title })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!adRow) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }
  if (!isPublicAdStatus(adRow.status)) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  const [existingFav] = await db
    .select({ adId: adFavoritesTable.adId })
    .from(adFavoritesTable)
    .where(and(eq(adFavoritesTable.adId, adId), eq(adFavoritesTable.userId, userId)))
    .limit(1);

  if (useDenormalizedReactionCounters()) {
    const result = await applyReactionToggle({
      kind: "favorite",
      adId,
      userId,
      action: "add",
    });
    if (result.active && !existingFav && adRow.userId != null && adRow.userId !== userId) {
      try {
        const shortTitle = adRow.title.trim().slice(0, 120) || "إعلانك";
        await createNotification({
          userId: adRow.userId,
          type: "ad.favorited",
          title: "إضافة إلى المفضلة",
          body: `أُضيف إعلانك إلى المفضلة: ${shortTitle}`,
          entityType: "ad",
          entityId: adId,
          metadata: { adTitle: shortTitle },
        });
      } catch (err) {
        logger.warn({ err, adId }, "createNotification failed (ad.favorited)");
      }
    }
    res.json(result);
    return;
  }
  const inserted = await db
    .insert(adFavoritesTable)
    .values({ adId, userId })
    .onConflictDoNothing({
      target: [adFavoritesTable.adId, adFavoritesTable.userId],
    })
    .returning({ adId: adFavoritesTable.adId });
  if (inserted.length > 0 && adRow.userId != null && adRow.userId !== userId) {
    try {
      const shortTitle = adRow.title.trim().slice(0, 120) || "إعلانك";
      await createNotification({
        userId: adRow.userId,
        type: "ad.favorited",
        title: "إضافة إلى المفضلة",
        body: `أُضيف إعلانك إلى المفضلة: ${shortTitle}`,
        entityType: "ad",
        entityId: adId,
        metadata: { adTitle: shortTitle },
      });
    } catch (err) {
      logger.warn({ err, adId }, "createNotification failed (ad.favorited)");
    }
  }
  res.json(await reactionResponse("favorite", adFavoritesTable, adId, userId));
});

router.delete("/ads/:adId/favorite", requireAuth, requireUserCsrf, async (req, res) => {
  const adId = parseAdId(req, res);
  if (adId === null) return;
  const userId = req.session.userId!;
  if (useDenormalizedReactionCounters()) {
    res.json(
      await applyReactionToggle({
        kind: "favorite",
        adId,
        userId,
        action: "remove",
      }),
    );
    return;
  }
  await db
    .delete(adFavoritesTable)
    .where(
      and(eq(adFavoritesTable.adId, adId), eq(adFavoritesTable.userId, userId)),
    );
  res.json(await reactionResponse("favorite", adFavoritesTable, adId, userId));
});

router.post("/ads", requireAuth, requireUserCsrf, createAdLimiter, async (req, res) => {
  const userId = req.session.userId!;
  const newAccountLimit = await assertUserCanCreateAd(userId);
  if (newAccountLimit) {
    res.status(429).json({ error: newAccountLimit, code: "NEW_ACCOUNT_AD_LIMIT" });
    return;
  }

  const body = CreateAdBody.parse(req.body);
  if (await findDuplicateAd(userId, body.title, body.description)) {
    res.status(409).json({
      error: "يبدو أنك نشرت إعلاناً مشابهاً مؤخراً",
      code: "DUPLICATE_AD",
    });
    return;
  }

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
  if (useDenormalizedReactionCounters()) {
    await ensureCounterRow(id);
  }
  const rows = await fetchAdsList({
    currentUserId: null,
    where: eq(adsTable.id, id),
    limit: 1,
  });
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

  const prevSnapshot = adSnapshotFromRow(prevRow);
  const nextSnapshot = adSnapshotFromRow({
    ...prevRow,
    title: typeof b.title === "string" ? b.title : prevRow.title,
    description:
      typeof b.description === "string" ? b.description : prevRow.description,
    price: nextPrice,
    priceType: typeof b.priceType === "string" ? b.priceType : prevRow.priceType,
    type: typeof b.type === "string" ? b.type : prevRow.type,
    city: typeof b.city === "string" ? b.city : prevRow.city,
    images: nextImages,
    categoryId: typeof b.categoryId === "number" ? b.categoryId : prevRow.categoryId,
    subcategoryId: nextSubcategory,
    sellerName:
      typeof b.sellerName === "string" ? b.sellerName : prevRow.sellerName,
    sellerPhone:
      typeof b.sellerPhone === "string" ? b.sellerPhone : prevRow.sellerPhone,
    details:
      b.details && typeof b.details === "object"
        ? (b.details as Record<string, unknown>)
        : (prevRow.details as Record<string, unknown>),
  });

  const nextStatus = isAdminWithValidSession
    ? prevRow.status
    : computeAdStatusAfterUserEdit(prevRow.status, prevSnapshot, nextSnapshot);
  const clearFeatured = shouldClearFeaturedOnReReview(
    prevRow.status,
    nextStatus,
    prevRow.featured === true,
  );

  await db
    .update(adsTable)
    .set({
      title: nextSnapshot.title,
      description: nextSnapshot.description,
      price: nextSnapshot.price,
      priceType: nextSnapshot.priceType,
      type: nextSnapshot.type,
      city: nextSnapshot.city,
      images: nextSnapshot.images,
      categoryId: nextSnapshot.categoryId,
      subcategoryId: nextSnapshot.subcategoryId,
      sellerName: nextSnapshot.sellerName,
      sellerPhone: nextSnapshot.sellerPhone,
      details: nextSnapshot.details,
      status: nextStatus,
      ...(clearFeatured ? { featured: false } : {}),
    })
    .where(eq(adsTable.id, adId));

  if (
    !isAdminWithValidSession &&
    nextStatus === "pending" &&
    prevRow.status === "approved" &&
    prevRow.userId != null
  ) {
    try {
      await createNotification({
        userId: prevRow.userId,
        type: "ad.pending_review",
        title: "إعلانك قيد المراجعة",
        body: "تم تعديل إعلانك وسيُراجع من الإدارة قبل إعادة النشر",
        entityType: "ad",
        entityId: adId,
        metadata: { adId, fromStatus: prevRow.status, toStatus: nextStatus },
      });
    } catch (err) {
      logger.warn({ err, adId }, "createNotification failed (ad.pending_review)");
    }
  }

  const rows = await fetchAdsList({
    currentUserId: req.session.userId ?? null,
    where: eq(adsTable.id, adId),
    limit: 1,
  });

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

router.patch("/admin/ads/:id/status", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminCsrf, async (req, res) => {
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

  let moderationReason = "";
  if (status === "rejected") {
    const parsed = parseModerationReason(req.body?.reason, "ad_reject");
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    moderationReason = parsed.reason;
  }

  await db.update(adsTable).set({ status }).where(eq(adsTable.id, id));

  const actionKey =
    status === "approved"
      ? before.status === "hidden"
        ? "ad.unhide"
        : "ad.approve"
      : status === "rejected"
        ? "ad.reject"
        : "ad.hide";
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey,
    targetType: "ad",
    targetId: id,
    previousState: before.status,
    newState: status,
    reason: moderationReason || null,
    deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
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
          body: moderationReason || `لم يُعتمد الإعلان: ${shortTitle}`,
          entityType: "ad",
          entityId: id,
          metadata: { adTitle: shortTitle, reason: moderationReason },
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

  const statusLabels: Record<string, string> = {
    approved: "مقبول",
    rejected: "مرفوض",
    hidden: "مخفي",
  };
  return res.json(
    okAdminActionFeedback({
      title:
        status === "approved"
          ? "تم قبول الإعلان"
          : status === "rejected"
            ? "تم رفض الإعلان"
            : "تم إخفاء الإعلان",
      description: `الإعلان #${id} — الحالة: ${statusLabels[status] ?? status}`,
      nextStep:
        status === "approved"
          ? "سيتم إشعار البائع وقد يظهر الإعلان للمستخدمين."
          : "سيتم إشعار البائع بالقرار.",
      auditActivityId,
    }),
  );
});

router.post("/admin/ads/:id/claim", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف غير صالح" });
  }
  const [row] = await db.select({ id: adsTable.id }).from(adsTable).where(eq(adsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "الإعلان غير موجود" });

  try {
    const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
    await assertStaffCanClaim(staff, "ads");
    const assignment = await claimAd({ adId: id, actorAdminId: getAdminActorId(req) });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "ad.claim",
      targetType: "ad",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم استلام الإعلان",
        description: `أصبحت مسؤولاً عن مراجعة الإعلان #${id}`,
        nextStep: "راجع التفاصيل واتخذ قرار قبول أو رفض.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "STAFF_CLAIM_LIMIT_REACHED" || err.message === "STAFF_DOMAIN_CLAIM_LIMIT_REACHED")) {
      return res.status(409).json({
        error: "لا يمكن استلام المزيد من الإعلانات حاليًا — تم بلوغ حد الحمل",
        code: err.message,
      });
    }
    throw err;
  }
});

router.post("/admin/ads/:id/assign", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminFounder(), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const staffId = Number(req.body?.staffId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف غير صالح" });
  }
  if (!Number.isInteger(staffId) || staffId <= 0) {
    return res.status(400).json({ error: "معرّف الموظف غير صالح" });
  }
  const [row] = await db.select({ id: adsTable.id }).from(adsTable).where(eq(adsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "الإعلان غير موجود" });

  const assignment = await assignAd({
    adId: id,
    staffId,
    actorAdminId: getAdminActorId(req),
  });
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "ad.assign",
    targetType: "ad",
    targetId: id,
    newState: assignment.staffName,
    deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
    extra: { staffId },
  });
  return res.json({
    assignment,
    ...okAdminActionFeedback({
      title: "تم إسناد الإعلان",
      description: `أُسند الإعلان #${id} إلى ${assignment.staffName ?? "الموظف"}.`,
      nextStep: "سيظهر في طابور الموظف المُسند.",
      auditActivityId,
    }),
  });
});

router.post("/admin/ads/:id/release", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "معرّف غير صالح" });
  }
  const assignment = await releaseAd(id);
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "ad.release",
    targetType: "ad",
    targetId: id,
    deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
  });
  return res.json({
    assignment,
    ...okAdminActionFeedback({
      title: "تم إلغاء الإسناد",
      description: `الإعلان #${id} أصبح غير مُسند`,
      nextStep: "يمكن لموظف آخر استلامه من الطابور.",
      auditActivityId,
    }),
  });
});

// يدوي من الأدمن فقط حالياً؛ لاحقاً يمكن ربط التفعيل بعمليات دفع/مدة (featuredUntil) دون تغيير المسار العام.
router.patch("/admin/ads/:id/featured", requireAdminAccessGrant, requireAdmin, requireAdminPermission("ads"), requireAdminCsrf, async (req, res) => {
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
      ...okAdminActionFeedback({
        title: featured ? "الإعلان مميز مسبقاً" : "الإعلان غير مميز مسبقاً",
        description: `الإعلان #${id} — لا تغيير مطلوب.`,
        nextStep: "يمكنك المتابعة دون إجراء.",
        auditActivityId: null,
      }),
      ok: true,
      id,
      featured: before.featured,
      status: before.status,
    });
  }

  await db.update(adsTable).set({ featured }).where(eq(adsTable.id, id));

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: featured ? "ad.feature_on" : "ad.feature_off",
    targetType: "ad",
    targetId: id,
    previousState: before.featured ? "featured" : "not_featured",
    newState: featured ? "featured" : "not_featured",
    deepLink: adminDeepLink(`/admin/ads?focusId=${id}`),
    extra: { status: before.status },
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
    ...okAdminActionFeedback({
      title: featured ? "تم تمييز الإعلان" : "تمت إزالة التمييز",
      description: `الإعلان #${id} — ${featured ? "أصبح ضمن المميزة" : "أُزيل التمييز"}.`,
      nextStep: featured
        ? "سيظهر في قسم المميزة إن كان معتمداً."
        : "لن يظهر في قسم المميزة.",
      auditActivityId,
    }),
    ok: true,
    id,
    featured: after?.featured ?? featured,
    status: after?.status ?? before.status,
  });
});

export default router;

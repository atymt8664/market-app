import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import crypto from "crypto";
import {
  db,
  usersTable,
  userFollowsTable,
  userViewsTable,
  userBlocksTable,
  adsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  InvalidSupabaseServiceRoleKeyError,
  MissingSupabaseStorageConfigError,
  SupabaseStorageBucketNotFoundError,
  SupabaseStorageConnectionError,
  uploadAvatarImageForUser,
} from "../lib/supabaseStorage";
import { PUBLIC_AD_STATUSES } from "../lib/ad-visibility";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { isUserSocketConnected } from "../lib/realtime";
import {
  clampLimit,
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "../lib/pagination";

const router: IRouter = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

function parseUserId(req: Request, res: Response): number | null {
  const n = Number(req.params["userId"]);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: "معرف مستخدم غير صالح" });
    return null;
  }
  return n;
}

function viewerKeyFor(req: Request): string {
  if (req.session.userId) return `u:${req.session.userId}`;
  const ip = (req.ip || req.socket.remoteAddress || "0.0.0.0")
    .split(",")[0]!
    .trim();
  const ua = req.get("user-agent") || "";
  return (
    "ip:" +
    crypto.createHash("sha256").update(ip + "|" + ua).digest("hex").slice(0, 32)
  );
}

async function followStats(profileId: number, currentUserId?: number | null) {
  const isOwner = currentUserId === profileId;
  const adVisibilityClause = isOwner
    ? eq(adsTable.userId, profileId)
    : and(
        eq(adsTable.userId, profileId),
        inArray(adsTable.status, [...PUBLIC_AD_STATUSES]),
      );
  const [followerRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followingId, profileId));
  const [followingRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followerId, profileId));
  const [viewsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userViewsTable)
    .where(eq(userViewsTable.profileId, profileId));
  const [adsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(adsTable)
    .where(adVisibilityClause);
  const [adViewsRow] = await db
    .select({ c: sql<number>`coalesce(sum(${adsTable.views}), 0)::int` })
    .from(adsTable)
    .where(adVisibilityClause);
  const likesResult = await db.execute<{ c: number }>(
    isOwner
      ? sql`select count(*)::int as c from ad_likes l inner join ads a on a.id = l.ad_id where a.user_id = ${profileId}`
      : sql`select count(*)::int as c from ad_likes l inner join ads a on a.id = l.ad_id where a.user_id = ${profileId} and a.status = 'approved'`,
  );
  const favoritesResult = await db.execute<{ c: number }>(
    isOwner
      ? sql`select count(*)::int as c from ad_favorites f inner join ads a on a.id = f.ad_id where a.user_id = ${profileId}`
      : sql`select count(*)::int as c from ad_favorites f inner join ads a on a.id = f.ad_id where a.user_id = ${profileId} and a.status = 'approved'`,
  );
  const likesRow = likesResult.rows[0];
  const favoritesRow = favoritesResult.rows[0];
  let isFollowing = false;
  if (currentUserId && currentUserId !== profileId) {
    const r = await db
      .select({ id: userFollowsTable.id })
      .from(userFollowsTable)
      .where(
        and(
          eq(userFollowsTable.followerId, currentUserId),
          eq(userFollowsTable.followingId, profileId),
        ),
      )
      .limit(1);
    isFollowing = !!r[0];
  }
  return {
    followerCount: Number(followerRow?.c ?? 0),
    followingCount: Number(followingRow?.c ?? 0),
    profileViews: Number(viewsRow?.c ?? 0),
    adCount: Number(adsRow?.c ?? 0),
    activeAdCount: Number(adsRow?.c ?? 0),
    totalAdViews: Number(adViewsRow?.c ?? 0),
    totalLikes: Number(likesRow?.c ?? 0),
    totalFavorites: Number(favoritesRow?.c ?? 0),
    isFollowing,
  };
}

const MAX_PRESENCE_BATCH = 50;

router.post("/users/presence-batch", requireAuth, async (req, res) => {
  const me = req.session.userId!;
  const raw = (req.body as { userIds?: unknown })?.userIds;
  if (!Array.isArray(raw)) {
    res.status(400).json({ error: "userIds مطلوب" });
    return;
  }
  const idSet = new Set<number>();
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isInteger(n) && n > 0 && n !== me) idSet.add(n);
  }
  const unique = [...idSet].slice(0, MAX_PRESENCE_BATCH);
  if (unique.length === 0) {
    res.json({ byUserId: {} as Record<string, unknown> });
    return;
  }

  const blockRows = await db
    .select({
      blockerId: userBlocksTable.blockerId,
      blockedId: userBlocksTable.blockedId,
    })
    .from(userBlocksTable)
    .where(
      or(
        and(eq(userBlocksTable.blockerId, me), inArray(userBlocksTable.blockedId, unique)),
        and(eq(userBlocksTable.blockedId, me), inArray(userBlocksTable.blockerId, unique)),
      ),
    );
  const blockedTargets = new Set<number>();
  for (const row of blockRows) {
    blockedTargets.add(row.blockerId === me ? row.blockedId : row.blockerId);
  }

  const userRows = await db
    .select({ id: usersTable.id, lastSeenAt: usersTable.lastSeenAt })
    .from(usersTable)
    .where(inArray(usersTable.id, unique));
  const lastSeenMap = new Map(userRows.map((r) => [r.id, r.lastSeenAt]));

  const byUserId: Record<
    string,
    { visibility: "hidden" } | { visibility: "full"; isOnline: boolean; lastSeenAt: string | null }
  > = {};
  for (const id of unique) {
    if (blockedTargets.has(id)) {
      byUserId[String(id)] = { visibility: "hidden" };
      continue;
    }
    const ls = lastSeenMap.get(id) ?? null;
    byUserId[String(id)] = {
      visibility: "full",
      isOnline: isUserSocketConnected(id),
      lastSeenAt: ls ? ls.toISOString() : null,
    };
  }
  res.json({ byUserId });
});

router.get("/users/:userId/block-status", requireAuth, async (req, res) => {
  const targetId = parseUserId(req, res);
  if (targetId === null) return;
  const me = req.session.userId!;
  if (me === targetId) {
    res.status(400).json({
      error: "لا يمكن طلب حالة الحظر لنفسك",
      blockedByMe: false,
    });
    return;
  }
  const byMe = await db
    .select({ id: userBlocksTable.id })
    .from(userBlocksTable)
    .where(
      and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, targetId)),
    )
    .limit(1);
  const byThem = await db
    .select({ id: userBlocksTable.id })
    .from(userBlocksTable)
    .where(
      and(eq(userBlocksTable.blockerId, targetId), eq(userBlocksTable.blockedId, me)),
    )
    .limit(1);
  res.json({ blockedByMe: Boolean(byMe[0]), blocksMe: Boolean(byThem[0]) });
});

router.post("/users/:userId/block", requireAuth, requireUserCsrf, async (req, res) => {
  const targetId = parseUserId(req, res);
  if (targetId === null) return;
  const me = req.session.userId!;
  if (me === targetId) {
    res.status(400).json({ error: "لا يمكنك حظر نفسك", blocked: false });
    return;
  }
  const exists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, targetId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "المستخدم غير موجود", blocked: false });
    return;
  }
  const inserted = await db
    .insert(userBlocksTable)
    .values({ blockerId: me, blockedId: targetId })
    .onConflictDoNothing({
      target: [userBlocksTable.blockerId, userBlocksTable.blockedId],
    })
    .returning({ id: userBlocksTable.id });
  const createdNew = inserted.length > 0;
  res.status(createdNew ? 201 : 200).json({
    blocked: true,
    created: createdNew,
  });
});

router.delete("/users/:userId/block", requireAuth, requireUserCsrf, async (req, res) => {
  const targetId = parseUserId(req, res);
  if (targetId === null) return;
  const me = req.session.userId!;
  if (me === targetId) {
    res.status(400).json({ error: "لا يمكنك إلغاء حظر نفسك" });
    return;
  }
  const deleted = await db
    .delete(userBlocksTable)
    .where(
      and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, targetId)),
    )
    .returning({ id: userBlocksTable.id });
  res.json({
    blocked: false,
    removed: deleted.length > 0,
  });
});

router.get("/users/:userId/followers", async (req, res) => {
  try {
    const targetId = parseUserId(req, res);
    if (targetId === null) return;
    const exists = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, targetId))
      .limit(1);
    if (!exists[0]) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SOCIAL,
    );
    const rows = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
        followCreatedAt: userFollowsTable.createdAt,
        followId: userFollowsTable.id,
      })
      .from(userFollowsTable)
      .innerJoin(usersTable, eq(usersTable.id, userFollowsTable.followerId))
      .where(
        and(
          eq(userFollowsTable.followingId, targetId),
          pagination.cursor
            ? keysetWhereDesc(
                userFollowsTable.createdAt,
                userFollowsTable.id,
                pagination.cursor,
              )
            : undefined,
        ),
      )
      .orderBy(desc(userFollowsTable.createdAt), desc(userFollowsTable.id))
      .limit(pagination.fetchLimit);
    const { items, meta } = finalizePage(rows, pagination.limit, (r) => ({
      at: r.followCreatedAt,
      id: r.followId,
    }));
    sendJsonArrayPage(
      res,
      items.map((r) => ({
        userId: r.userId,
        name: r.name,
        avatarUrl: r.avatarUrl ?? null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/users/:userId/following", async (req, res) => {
  try {
    const targetId = parseUserId(req, res);
    if (targetId === null) return;
    const exists = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, targetId))
      .limit(1);
    if (!exists[0]) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SOCIAL,
    );
    const rows = await db
      .select({
        userId: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
        followCreatedAt: userFollowsTable.createdAt,
        followId: userFollowsTable.id,
      })
      .from(userFollowsTable)
      .innerJoin(usersTable, eq(usersTable.id, userFollowsTable.followingId))
      .where(
        and(
          eq(userFollowsTable.followerId, targetId),
          pagination.cursor
            ? keysetWhereDesc(
                userFollowsTable.createdAt,
                userFollowsTable.id,
                pagination.cursor,
              )
            : undefined,
        ),
      )
      .orderBy(desc(userFollowsTable.createdAt), desc(userFollowsTable.id))
      .limit(pagination.fetchLimit);
    const { items, meta } = finalizePage(rows, pagination.limit, (r) => ({
      at: r.followCreatedAt,
      id: r.followId,
    }));
    sendJsonArrayPage(
      res,
      items.map((r) => ({
        userId: r.userId,
        name: r.name,
        avatarUrl: r.avatarUrl ?? null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/users/:userId/profile-viewers", requireAuth, async (req, res) => {
  const targetId = parseUserId(req, res);
  if (targetId === null) return;
  const me = req.session.userId!;
  if (me !== targetId) {
    res.status(403).json({ error: "عرض قائمة المشاهدين متاح لصاحب الملف فقط" });
    return;
  }
  const exists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, targetId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  const viewerLimit = clampLimit(req.query.limit, PAGINATION.SOCIAL);
  const agg = await db.execute<{ viewer_key: string; last_at: unknown }>(
    sql`
      select viewer_key, max(created_at) as last_at
      from user_views
      where profile_id = ${targetId}
      group by viewer_key
      order by max(created_at) desc
      limit ${viewerLimit}
    `,
  );
  const raw = agg.rows as Array<{ viewer_key: string; last_at: unknown }>;
  const userIds = new Set<number>();
  for (const row of raw) {
    const m = /^u:(\d+)$/.exec(String(row.viewer_key));
    if (m) userIds.add(Number(m[1]));
  }
  const idList = [...userIds];
  const userRows =
    idList.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, idList))
      : [];
  const userById = new Map(userRows.map((u) => [u.id, u]));
  const items: Array<{
    userId: number | null;
    name: string;
    avatarUrl: string | null;
    lastViewedAt: string;
  }> = [];
  let anonymousDistinctCount = 0;
  for (const row of raw) {
    const key = String(row.viewer_key);
    const lastRaw = row.last_at;
    const lastAt =
      lastRaw instanceof Date ? lastRaw : new Date(String(lastRaw ?? Date.now()));
    const m = /^u:(\d+)$/.exec(key);
    if (m) {
      const uid = Number(m[1]);
      const u = userById.get(uid);
      if (u) {
        items.push({
          userId: uid,
          name: u.name,
          avatarUrl: u.avatarUrl ?? null,
          lastViewedAt: lastAt.toISOString(),
        });
      } else {
        anonymousDistinctCount += 1;
      }
    } else {
      anonymousDistinctCount += 1;
    }
  }
  res.json({ items, anonymousDistinctCount });
});

router.get("/users/:userId", async (req, res) => {
  const userId = parseUserId(req, res);
  if (userId === null) return;
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      city: usersTable.city,
      avatarUrl: usersTable.avatarUrl,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const u = rows[0];
  if (!u) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  const stats = await followStats(userId, req.session.userId ?? null);
  res.json({
    id: u.id,
    name: u.name,
    city: u.city,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt.toISOString(),
    isSelf: req.session.userId === u.id,
    ...stats,
  });
});

router.post("/users/:userId/view", async (req, res) => {
  const userId = parseUserId(req, res);
  if (userId === null) return;
  const exists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  // Don't count viewers viewing their own profile.
  let counted = false;
  if (req.session.userId !== userId) {
    const result = await db
      .insert(userViewsTable)
      .values({ profileId: userId, viewerKey: viewerKeyFor(req) })
      .onConflictDoNothing({
        target: [userViewsTable.profileId, userViewsTable.viewerKey],
      })
      .returning({ id: userViewsTable.id });
    counted = result.length > 0;
  }
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userViewsTable)
    .where(eq(userViewsTable.profileId, userId));
  res.json({ profileViews: Number(row?.c ?? 0), counted });
});

router.post("/users/:userId/follow", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = parseUserId(req, res);
  if (userId === null) return;
  const me = req.session.userId!;
  if (me === userId) {
    res.status(400).json({ error: "لا يمكنك متابعة نفسك" });
    return;
  }
  const exists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  await db
    .insert(userFollowsTable)
    .values({ followerId: me, followingId: userId })
    .onConflictDoNothing({
      target: [userFollowsTable.followerId, userFollowsTable.followingId],
    });
  const stats = await followStats(userId, me);
  res.json({
    isFollowing: true,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
  });
});

router.delete("/users/:userId/follow", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = parseUserId(req, res);
  if (userId === null) return;
  const me = req.session.userId!;
  await db
    .delete(userFollowsTable)
    .where(
      and(
        eq(userFollowsTable.followerId, me),
        eq(userFollowsTable.followingId, userId),
      ),
    );
  const stats = await followStats(userId, me);
  res.json({
    isFollowing: false,
    followerCount: stats.followerCount,
    followingCount: stats.followingCount,
  });
});

router.post(
  "/users/upload-avatar",
  requireAuth,
  requireUserCsrf,
  avatarUpload.single("image"),
  async (req, res) => {
    const userId = req.session.userId!;
    const file = req.file;

    req.log.info(
      {
        hasFile: !!file,
        fileFieldName: file?.fieldname,
        fileName: file?.originalname,
        fileType: file?.mimetype,
        fileSize: file?.size ?? 0,
      },
      "Avatar upload request received",
    );

    if (!file) {
      res.status(400).json({ error: "لم يتم استلام ملف الصورة" });
      return;
    }
    if (!file.mimetype?.startsWith("image/")) {
      res.status(400).json({ error: "الملف المحدد ليس صورة" });
      return;
    }
    if (!file.buffer || file.size === 0) {
      res.status(400).json({ error: "ملف الصورة فارغ أو تالف" });
      return;
    }

    try {
      const imageUrl = await uploadAvatarImageForUser(userId, {
        buffer: file.buffer,
        mimetype: file.mimetype,
      });
      await db
        .update(usersTable)
        .set({ avatarUrl: imageUrl })
        .where(eq(usersTable.id, userId));

      res.json({ success: true, imageUrl });
    } catch (error) {
      if (error instanceof MissingSupabaseStorageConfigError) {
        req.log.warn(
          {
            missingEnvVar: error.missingEnvVar,
          },
          "Missing Supabase storage config for avatar upload",
        );
        res.status(503).json({
          error: "خدمة رفع الصور غير متاحة حالياً",
          code: "SUPABASE_STORAGE_NOT_CONFIGURED",
          missingEnvVar: error.missingEnvVar,
        });
        return;
      }
      if (error instanceof InvalidSupabaseServiceRoleKeyError) {
        req.log.error(
          { jwtRole: error.jwtRole },
          "Invalid Supabase service role key for avatar upload",
        );
        res.status(503).json({
          error:
            "إعداد خادم التخزين غير صحيح: استخدم مفتاح service_role من لوحة Supabase وليس مفتاح anon",
          code: "SUPABASE_SERVICE_ROLE_KEY_INVALID",
        });
        return;
      }
      if (error instanceof SupabaseStorageConnectionError) {
        const safeReason = error.message.slice(0, 280);
        req.log.error(
          { step: error.step, code: error.code, supabaseMessage: safeReason },
          "Supabase storage connection failed (avatar)",
        );
        res.status(503).json({
          error: "تعذر الاتصال بخدمة التخزين، يرجى المحاولة لاحقاً",
          code: "SUPABASE_STORAGE_CONNECTION_FAILED",
          reason: safeReason,
        });
        return;
      }
      if (error instanceof SupabaseStorageBucketNotFoundError) {
        const safeReason = error.message.slice(0, 280);
        req.log.error(
          { step: error.step, code: error.code, supabaseMessage: safeReason },
          "Supabase storage bucket missing (avatar)",
        );
        res.status(503).json({
          error: "مجلد التخزين غير متاح، يرجى التحقق من إعدادات المشروع",
          code: "BUCKET_NOT_FOUND",
          reason: safeReason,
        });
        return;
      }
      const msg =
        error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
      req.log.error({ err: error, supabaseMessage: msg.slice(0, 280) }, "Avatar upload failed");
      res.status(500).json({
        error: "فشل رفع الصورة",
        code: "STORAGE_UPLOAD_FAILED",
        reason: msg.slice(0, 280),
      });
    }
  },
);

router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "حجم الصورة يتجاوز الحد المسموح (5MB)" });
      return;
    }
    res.status(400).json({ error: "فشل قراءة ملف الصورة" });
    return;
  }
  next(err);
});

export default router;

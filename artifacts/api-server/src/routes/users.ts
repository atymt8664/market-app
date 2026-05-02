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
  adsTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  InvalidSupabaseServiceRoleKeyError,
  MissingSupabaseStorageConfigError,
  uploadAvatarImageForUser,
} from "../lib/supabaseStorage";
import { PUBLIC_AD_STATUSES } from "../lib/ad-visibility";

const router: IRouter = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  next();
}

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

router.post("/users/:userId/follow", requireAuth, async (req, res) => {
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

router.delete("/users/:userId/follow", requireAuth, async (req, res) => {
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

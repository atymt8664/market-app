import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import crypto from "crypto";
import {
  db,
  usersTable,
  userFollowsTable,
  userViewsTable,
  adsTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

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
    .where(eq(adsTable.userId, profileId));
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

export default router;

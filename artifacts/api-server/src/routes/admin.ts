import { Router } from "express";
import {
  db,
  adsTable,
  reportsTable,
  supportTicketsTable,
  usersTable,
} from "@workspace/db";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  const [usersTotal] = await db.select({ c: count() }).from(usersTable);
  const [adsTotal] = await db.select({ c: count() }).from(adsTable);
  const [reportsTotal] = await db.select({ c: count() }).from(reportsTable);
  const [viewsTotal] = await db
    .select({ c: sql<number>`coalesce(sum(${adsTable.views}), 0)::int` })
    .from(adsTable);

  const latestReports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
      reporterName: usersTable.name,
      targetAdId: reportsTable.targetAdId,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
    .orderBy(desc(reportsTable.createdAt))
    .limit(8);

  let latestSupportTickets: Array<{
    id: number;
    subject: string;
    status: string;
    createdAt: Date;
    userName: string | null;
  }> = [];
  try {
    latestSupportTickets = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        userName: usersTable.name,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(8);
  } catch {
    latestSupportTickets = [];
  }

  const topAds = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      views: adsTable.views,
      status: adsTable.status,
      city: adsTable.city,
    })
    .from(adsTable)
    .orderBy(desc(adsTable.views), desc(adsTable.createdAt))
    .limit(8);

  const topCities = await db
    .select({
      city: adsTable.city,
      adsCount: count(adsTable.id),
      totalViews: sql<number>`coalesce(sum(${adsTable.views}), 0)::int`,
    })
    .from(adsTable)
    .where(and(sql`${adsTable.city} is not null`, sql`${adsTable.city} <> ''`))
    .groupBy(adsTable.city)
    .orderBy(desc(count(adsTable.id)))
    .limit(8);

  const adsStatus = await db
    .select({
      status: adsTable.status,
      value: count(adsTable.id),
    })
    .from(adsTable)
    .groupBy(adsTable.status);

  return res.json({
    totals: {
      users: Number(usersTotal?.c ?? 0),
      ads: Number(adsTotal?.c ?? 0),
      reports: Number(reportsTotal?.c ?? 0),
      views: Number(viewsTotal?.c ?? 0),
    },
    latestReports: latestReports.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    latestSupportTickets: latestSupportTickets.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    topAds,
    topCities: topCities.map((row) => ({
      city: row.city || "غير محدد",
      adsCount: Number(row.adsCount ?? 0),
      totalViews: Number(row.totalViews ?? 0),
    })),
    adsStatus: adsStatus.map((row) => ({
      status: row.status || "unknown",
      value: Number(row.value ?? 0),
    })),
  });
});

router.get("/admin/reports", requireAdmin, async (_req, res) => {
  const reports = await db
    .select({
      id: reportsTable.id,
      reporterId: reportsTable.reporterId,
      reporterName: usersTable.name,
      reporterEmail: usersTable.email,
      targetUserId: reportsTable.targetUserId,
      targetAdId: reportsTable.targetAdId,
      reason: reportsTable.reason,
      description: reportsTable.description,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
    .orderBy(desc(reportsTable.createdAt));

  return res.json(
    reports.map((report) => ({
      ...report,
      targetType: report.targetAdId ? "ad" : report.targetUserId ? "user" : "unknown",
      createdAt: report.createdAt ? report.createdAt.toISOString() : null,
    })),
  );
});

router.patch("/admin/reports/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const status = String(req.body?.status || "").trim();
  const allowed = ["pending", "in_review", "resolved", "rejected"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const updated = await db
    .update(reportsTable)
    .set({ status })
    .where(eq(reportsTable.id, id))
    .returning({ id: reportsTable.id, status: reportsTable.status });

  if (!updated[0]) {
    return res.status(404).json({ error: "Report not found" });
  }

  return res.json(updated[0]);
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "all").trim().toLowerCase();

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isBanned: usersTable.isBanned,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(
      and(
        status === "active"
          ? eq(usersTable.isBanned, false)
          : status === "banned"
            ? eq(usersTable.isBanned, true)
            : undefined,
        q
          ? or(
              ilike(usersTable.name, `%${q}%`),
              ilike(usersTable.email, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(usersTable.createdAt));

  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.isBanned ? "banned" : "active",
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  );
});

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      city: usersTable.city,
      avatarUrl: usersTable.avatarUrl,
      isBanned: usersTable.isBanned,
      emailVerified: usersTable.emailVerified,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const [adsCountRow] = await db
    .select({ value: count(adsTable.id) })
    .from(adsTable)
    .where(eq(adsTable.userId, id));
  const [reportsCountRow] = await db
    .select({ value: count(reportsTable.id) })
    .from(reportsTable)
    .where(eq(reportsTable.targetUserId, id));
  const [supportCountRow] = await db
    .select({ value: count(supportTicketsTable.id) })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, id));

  const ads = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      status: adsTable.status,
      city: adsTable.city,
      views: adsTable.views,
      createdAt: adsTable.createdAt,
    })
    .from(adsTable)
    .where(eq(adsTable.userId, id))
    .orderBy(desc(adsTable.createdAt))
    .limit(50);

  const reports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      description: reportsTable.description,
      status: reportsTable.status,
      targetAdId: reportsTable.targetAdId,
      reporterName: usersTable.name,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
    .where(eq(reportsTable.targetUserId, id))
    .orderBy(desc(reportsTable.createdAt))
    .limit(20);

  const supportTickets = await db
    .select({
      id: supportTicketsTable.id,
      category: supportTicketsTable.category,
      subject: supportTicketsTable.subject,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      createdAt: supportTicketsTable.createdAt,
    })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, id))
    .orderBy(desc(supportTicketsTable.createdAt))
    .limit(20);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      status: user.isBanned ? "banned" : "active",
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    },
    stats: {
      adsCount: Number(adsCountRow?.value ?? 0),
      reportsCount: Number(reportsCountRow?.value ?? 0),
      supportTicketsCount: Number(supportCountRow?.value ?? 0),
    },
    ads: ads.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    reports: reports.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
    supportTickets: supportTickets.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    })),
  });
});

router.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const status = String(req.body?.status || "").trim().toLowerCase();
  if (!["active", "banned"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: status === "banned" })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      isBanned: usersTable.isBanned,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    status: updated.isBanned ? "banned" : "active",
    createdAt: updated.createdAt ? updated.createdAt.toISOString() : null,
  });
});

export default router;

import { Router } from "express";
import { db, reportsTable, usersTable, adsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireAdmin } from "../middlewares/require-admin";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";

const router = Router();

/**
 * إنشاء بلاغ
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const reporterId = (req.session as any).userId;

    const { targetUserId, targetAdId, reason, description } = req.body;

    if (!reporterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const hasUserTarget = Number.isInteger(targetUserId) && Number(targetUserId) > 0;
    const hasAdTarget = Number.isInteger(targetAdId) && Number(targetAdId) > 0;

    if (!hasUserTarget && !hasAdTarget) {
      return res.status(400).json({
        message: "You must report a user or an ad",
      });
    }

    if (hasUserTarget && hasAdTarget) {
      return res.status(400).json({
        message: "Report must target either a user or an ad, not both",
      });
    }

    const report = await db
      .insert(reportsTable)
      .values({
        reporterId,
        targetUserId: hasUserTarget ? Number(targetUserId) : null,
        targetAdId: hasAdTarget ? Number(targetAdId) : null,
        reason,
        description: description ?? null,
      })
      .returning();

    return res.json(report[0]);
  } catch (_err) {
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * جلب البلاغات للأدمن
 */
router.get("/admin", requireAdmin, async (_req, res) => {
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

router.patch("/admin/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const status = String(req.body?.status || "").trim();
  const allowed = ["pending", "in_review", "resolved", "rejected", "ignored"];
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

router.post("/admin/:id/ad-action", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const action = String(req.body?.action || "").trim();
  if (!["hide", "delete"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const reportRows = await db
    .select({
      id: reportsTable.id,
      targetAdId: reportsTable.targetAdId,
    })
    .from(reportsTable)
    .where(eq(reportsTable.id, id))
    .limit(1);
  const report = reportRows[0];
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  if (!report.targetAdId) {
    return res.status(400).json({ error: "Report is not related to an ad" });
  }

  if (action === "hide") {
    await db
      .update(adsTable)
      .set({ status: "hidden" })
      .where(eq(adsTable.id, report.targetAdId));
  } else {
    await db.delete(adsTable).where(eq(adsTable.id, report.targetAdId));
  }

  await db
    .update(reportsTable)
    .set({ status: "resolved" })
    .where(eq(reportsTable.id, id));

  await logAdminActivity({
    action: action === "hide" ? "ad.hide" : "ad.delete",
    actorAdminId: getAdminActorId(req),
    targetType: "ad",
    targetId: report.targetAdId,
    details: { source: "reports.ad_action", reportId: id },
  });
  await logAdminActivity({
    action: "report.resolve",
    actorAdminId: getAdminActorId(req),
    targetType: "report",
    targetId: id,
    details: { via: "ad_action", adAction: action, targetAdId: report.targetAdId },
  });

  return res.json({ success: true, action, targetAdId: report.targetAdId });
});

export default router;

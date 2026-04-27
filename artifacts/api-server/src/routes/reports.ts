import { Router } from "express";
import { db, reportsTable, usersTable, adsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";

const router = Router();

/**
 * إنشاء بلاغ
 */
router.post("/", requireAuth, async (req, res) => {
  console.log("🔥 REPORT HIT", req.body);

  try {
    const reporterId = (req.session as any).userId;

    const { targetUserId, targetAdId, reason, description } = req.body;

    console.log("🔥 REPORT DATA:", { reporterId, targetAdId, reason });

    if (!reporterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    if (!targetUserId && !targetAdId) {
      return res.status(400).json({
        message: "You must report a user or an ad",
      });
    }

    const report = await db
      .insert(reportsTable)
      .values({
        reporterId,
        targetUserId: targetUserId ?? null,
        targetAdId: targetAdId ?? null,
        reason,
        description: description ?? null,
      })
      .returning();

    return res.json(report[0]);
  } catch (err) {
    console.error("REPORT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * جلب البلاغات للأدمن
 */
router.get("/admin", async (req, res) => {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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

router.patch("/admin/:id/status", async (req, res) => {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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

router.post("/admin/:id/ad-action", async (req, res) => {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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

  return res.json({ success: true, action, targetAdId: report.targetAdId });
});

export default router;

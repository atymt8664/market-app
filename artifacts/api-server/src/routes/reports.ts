import { Router } from "express";
import { db, reportsTable } from "@workspace/db";
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

  const reports = await db.select().from(reportsTable);
  return res.json(reports);
});

export default router;

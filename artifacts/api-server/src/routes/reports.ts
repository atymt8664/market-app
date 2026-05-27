import { Router } from "express";
import { db, reportsTable, usersTable, adsTable, conversationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import { findDuplicateReport } from "../lib/trust-safety/abuse-checks";
import { createReportLimiter } from "../lib/trust-safety/trust-limits";

const router = Router();

/**
 * إنشاء بلاغ
 */
router.post("/", requireAuth, requireUserCsrf, createReportLimiter, async (req, res) => {
  try {
    const reporterId = (req.session as any).userId;

    const {
      targetUserId,
      targetAdId,
      reason,
      description,
      conversationId,
      reportConversation,
    } = req.body;

    if (!reporterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const reportConversationOnly = reportConversation === true;

    const hasUserTarget = Number.isInteger(targetUserId) && Number(targetUserId) > 0;
    const hasAdTarget = Number.isInteger(targetAdId) && Number(targetAdId) > 0;

    if (reportConversationOnly) {
      if (conversationId === undefined || conversationId === null || conversationId === "") {
        return res.status(400).json({ message: "conversationId is required for conversation reports" });
      }
      const cid = Number(conversationId);
      if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }
      const convRows = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, cid))
        .limit(1);
      const conv = convRows[0];
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conv.buyerId !== reporterId && conv.sellerId !== reporterId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (
        await findDuplicateReport({
          reporterId,
          targetUserId: null,
          targetAdId: null,
          relatedConversationId: cid,
          reason: String(reason),
        })
      ) {
        return res.status(409).json({
          message: "لقد أبلغت عن هذه المحادثة مسبقاً مؤخراً",
          code: "DUPLICATE_REPORT",
        });
      }
      const report = await db
        .insert(reportsTable)
        .values({
          reporterId,
          targetUserId: null,
          targetAdId: null,
          relatedConversationId: cid,
          reason,
          description: description ?? null,
        })
        .returning();

      try {
        await createNotification({
          userId: reporterId,
          type: "report.received",
          title: "تم استلام البلاغ",
          body: "تم استلام بلاغك وسيتم مراجعته",
          entityType: "report",
          entityId: report[0]?.id ?? null,
          metadata: {
            reportId: report[0]?.id ?? null,
            targetType: "conversation",
            relatedConversationId: cid,
          },
        });
      } catch (err) {
        logger.warn(
          { err, reporterId, reportId: report[0]?.id },
          "createNotification failed (report.received conversation)",
        );
      }

      return res.json(report[0]);
    }

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

    let relatedConversationId: number | null = null;
    if (conversationId !== undefined && conversationId !== null && conversationId !== "") {
      const cid = Number(conversationId);
      if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }
      const convRows = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, cid))
        .limit(1);
      const conv = convRows[0];
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conv.buyerId !== reporterId && conv.sellerId !== reporterId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (hasUserTarget) {
        const uid = Number(targetUserId);
        const otherId = conv.buyerId === reporterId ? conv.sellerId : conv.buyerId;
        if (uid !== otherId) {
          return res.status(400).json({ message: "User target must be the other participant" });
        }
      }
      relatedConversationId = cid;
    }

    if (
      await findDuplicateReport({
        reporterId,
        targetUserId: hasUserTarget ? Number(targetUserId) : null,
        targetAdId: hasAdTarget ? Number(targetAdId) : null,
        relatedConversationId,
        reason: String(reason),
      })
    ) {
      return res.status(409).json({
        message: "لقد أبلغت عن هذا المحتوى مسبقاً مؤخراً",
        code: "DUPLICATE_REPORT",
      });
    }

    const report = await db
      .insert(reportsTable)
      .values({
        reporterId,
        targetUserId: hasUserTarget ? Number(targetUserId) : null,
        targetAdId: hasAdTarget ? Number(targetAdId) : null,
        relatedConversationId,
        reason,
        description: description ?? null,
      })
      .returning();

    try {
      await createNotification({
        userId: reporterId,
        type: "report.received",
        title: "تم استلام البلاغ",
        body: "تم استلام بلاغك وسيتم مراجعته",
        entityType: "report",
        entityId: report[0]?.id ?? null,
        metadata: {
          reportId: report[0]?.id ?? null,
          targetType: hasAdTarget ? "ad" : hasUserTarget ? "user" : "conversation",
          targetAdId: hasAdTarget ? Number(targetAdId) : null,
          targetUserId: hasUserTarget ? Number(targetUserId) : null,
        },
      });
    } catch (err) {
      logger.warn({ err, reporterId, reportId: report[0]?.id }, "createNotification failed (report.received)");
    }

    return res.json(report[0]);
  } catch (_err) {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

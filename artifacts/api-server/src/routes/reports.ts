import { Router } from "express";
import { db, reportsTable, usersTable, adsTable, conversationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import {
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "../lib/pagination";

const router = Router();

router.use("/admin", requireAdminIpAllowlist);

function reportStatusNotificationPayload(status: string): { type: string; title: string; body: string } | null {
  if (status === "in_review" || status === "reviewing") {
    return {
      type: "report.reviewing",
      title: "تحديث حالة البلاغ",
      body: "بلاغك قيد المراجعة",
    };
  }
  if (status === "resolved") {
    return {
      type: "report.resolved",
      title: "تحديث حالة البلاغ",
      body: "تم حل بلاغك",
    };
  }
  if (status === "ignored" || status === "dismissed" || status === "rejected") {
    return {
      type: "report.ignored",
      title: "تحديث حالة البلاغ",
      body: "تمت مراجعة بلاغك ولم يتم اتخاذ إجراء إضافي",
    };
  }
  return null;
}

/**
 * إنشاء بلاغ
 */
router.post("/", requireAuth, requireUserCsrf, async (req, res) => {
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

/**
 * جلب البلاغات للأدمن
 */
router.get("/admin", requireAdminAccessGrant, requireAdmin, async (req, res) => {
  try {
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADMIN_REPORTS,
    );
    const reports = await db
      .select({
        id: reportsTable.id,
        reporterId: reportsTable.reporterId,
        reporterName: usersTable.name,
        reporterEmail: usersTable.email,
        targetUserId: reportsTable.targetUserId,
        targetAdId: reportsTable.targetAdId,
        relatedConversationId: reportsTable.relatedConversationId,
        reason: reportsTable.reason,
        description: reportsTable.description,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
      })
      .from(reportsTable)
      .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
      .where(
        pagination.cursor
          ? keysetWhereDesc(reportsTable.createdAt, reportsTable.id, pagination.cursor)
          : undefined,
      )
      .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id))
      .limit(pagination.fetchLimit);

    const { items, meta } = finalizePage(reports, pagination.limit, (report) => ({
      at: report.createdAt ?? new Date(0),
      id: report.id,
    }));

    return sendJsonArrayPage(
      res,
      items.map((report) => ({
        ...report,
        relatedConversationId: report.relatedConversationId ?? null,
        targetType: report.targetAdId
          ? "ad"
          : report.targetUserId
            ? "user"
            : report.relatedConversationId
              ? "conversation"
              : "unknown",
        createdAt: report.createdAt ? report.createdAt.toISOString() : null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.patch("/admin/:id/status", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const status = String(req.body?.status || "").trim();
  const allowed = ["pending", "in_review", "resolved", "rejected", "ignored"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const [before] = await db
    .select({
      id: reportsTable.id,
      reporterId: reportsTable.reporterId,
      targetAdId: reportsTable.targetAdId,
      targetUserId: reportsTable.targetUserId,
      relatedConversationId: reportsTable.relatedConversationId,
      status: reportsTable.status,
    })
    .from(reportsTable)
    .where(eq(reportsTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "Report not found" });
  }

  const updated = await db
    .update(reportsTable)
    .set({ status })
    .where(eq(reportsTable.id, id))
    .returning({ id: reportsTable.id, status: reportsTable.status, reporterId: reportsTable.reporterId });

  const payload = reportStatusNotificationPayload(status);
  if (payload && before.reporterId) {
    try {
      await createNotification({
        userId: before.reporterId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: "report",
        entityId: id,
        metadata: {
          reportId: id,
          fromStatus: before.status,
          toStatus: status,
          targetAdId: before.targetAdId,
          targetUserId: before.targetUserId,
          relatedConversationId: before.relatedConversationId,
        },
      });
    } catch (err) {
      logger.warn({ err, reportId: id, status }, "createNotification failed (report status)");
    }
  }

  return res.json(updated[0]);
});

router.post("/admin/:id/ad-action", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
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
    const [targetAd] = await db
      .select({ id: adsTable.id, userId: adsTable.userId })
      .from(adsTable)
      .where(eq(adsTable.id, report.targetAdId))
      .limit(1);

    await db
      .update(adsTable)
      .set({ status: "hidden" })
      .where(eq(adsTable.id, report.targetAdId));

    if (targetAd?.userId) {
      try {
        await createNotification({
          userId: targetAd.userId,
          type: "ad.hidden",
          title: "تم إخفاء إعلانك",
          body: "تم إخفاء إعلانك من الإدارة ولن يظهر للمستخدمين حاليًا",
          entityType: "ad",
          entityId: targetAd.id,
          metadata: { adId: targetAd.id, source: "report.ad_action" },
        });
      } catch (err) {
        logger.warn({ err, adId: targetAd.id }, "createNotification failed (ad.hidden from report)");
      }
    }
  } else {
    const [targetAd] = await db
      .select({ id: adsTable.id, userId: adsTable.userId })
      .from(adsTable)
      .where(eq(adsTable.id, report.targetAdId))
      .limit(1);

    await db.delete(adsTable).where(eq(adsTable.id, report.targetAdId));

    if (targetAd?.userId) {
      try {
        await createNotification({
          userId: targetAd.userId,
          type: "ad.deleted",
          title: "تم حذف إعلانك",
          body: "تم حذف إعلانك من الإدارة",
          entityType: null,
          entityId: null,
          metadata: { adId: targetAd.id, source: "report.ad_action" },
        });
      } catch (err) {
        logger.warn({ err, adId: targetAd.id }, "createNotification failed (ad.deleted from report)");
      }
    }
  }

  await db
    .update(reportsTable)
    .set({ status: "resolved" })
    .where(eq(reportsTable.id, id));

  const [resolvedReport] = await db
    .select({ reporterId: reportsTable.reporterId })
    .from(reportsTable)
    .where(eq(reportsTable.id, id))
    .limit(1);

  if (resolvedReport?.reporterId) {
    try {
      await createNotification({
        userId: resolvedReport.reporterId,
        type: "report.resolved",
        title: "تحديث حالة البلاغ",
        body: "تم حل بلاغك",
        entityType: "report",
        entityId: id,
        metadata: { reportId: id, via: "ad_action", action, targetAdId: report.targetAdId },
      });
    } catch (err) {
      logger.warn({ err, reportId: id }, "createNotification failed (report resolved from ad action)");
    }
  }

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

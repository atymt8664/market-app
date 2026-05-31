import { Router } from "express";
import { db, adsTable, reportsTable, usersTable } from "@workspace/db";
import { desc, eq, and, count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { adminDeepLink, writeAdminAudit } from "../lib/admin-audit";
import { getAdminActorId } from "../lib/admin-activity-log";
import { parseModerationReason } from "../lib/admin-moderation-reason";
import {
  assignReport,
  buildStaffAssignmentView,
  claimReport,
  ensureStaffWorkflowSchema,
  releaseReport,
} from "../lib/admin-staff-workflow";
import { assertStaffCanClaim, getDomainQueueCounts, mapSlaFields } from "../lib/admin-operations-queue";
import { ensureSlaEscalationBeforeAdminRead } from "../lib/ops-cron";
import { isOpsQueueKey } from "../lib/admin-operations-sla";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import { FounderProtectedError } from "../lib/admin-staff";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminFounder } from "../middlewares/require-admin-founder";
import {
  buildAdminPageMeta,
  handlePaginationError,
  PAGINATION,
  parseAdminPageQuery,
  sendJsonAdminPage,
} from "../lib/pagination";
import {
  isAllowedReportStatus,
  normalizeReportStatus,
  reportAdminActivityAction,
  reportStatusNotificationPayload,
} from "../lib/trust-safety/report-status";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router = Router();

router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

async function mapReportRow(
  report: {
    id: number;
    reporterId: number;
    reporterName: string | null;
    reporterEmail: string | null;
    reporterAvatarUrl: string | null;
    targetUserId: number | null;
    targetAdId: number | null;
    relatedConversationId: number | null;
    reason: string;
    description: string | null;
    status: string;
    createdAt: Date | null;
    slaDueAt: Date | null;
    isUrgent: boolean;
    assignedStaffId: number | null;
    assignedAt: Date | null;
    assignedByAdminId: number | null;
    targetAdTitle: string | null;
    targetAdSellerName: string | null;
    targetAdOwnerAvatarUrl: string | null;
    targetAdOwnerName: string | null;
    targetProfileName: string | null;
    targetProfileAvatarUrl: string | null;
  },
) {
  const assignment = await buildStaffAssignmentView({
    assignedStaffId: report.assignedStaffId,
    assignedAt: report.assignedAt,
    assignedByAdminId: report.assignedByAdminId,
  });
  return {
    id: report.id,
    reporterId: report.reporterId,
    reporterName: report.reporterName,
    reporterEmail: report.reporterEmail,
    reporterAvatarUrl: report.reporterAvatarUrl,
    targetUserId: report.targetUserId,
    targetAdId: report.targetAdId,
    relatedConversationId: report.relatedConversationId ?? null,
    reason: report.reason,
    description: report.description,
    status: report.status,
    targetType: report.targetAdId
      ? "ad"
      : report.targetUserId
        ? "user"
        : report.relatedConversationId
          ? "conversation"
          : "unknown",
    targetAdTitle: report.targetAdTitle,
    targetAdSellerName: report.targetAdSellerName,
    targetAdOwnerAvatarUrl: report.targetAdOwnerAvatarUrl,
    targetAdOwnerName: report.targetAdOwnerName,
    targetProfileName: report.targetProfileName,
    targetProfileAvatarUrl: report.targetProfileAvatarUrl,
    assignment,
    createdAt: report.createdAt ? report.createdAt.toISOString() : null,
    ...mapSlaFields({
      domain: "reports",
      createdAt: report.createdAt ?? new Date(),
      slaDueAt: report.slaDueAt,
      status: report.status,
      row: { reason: report.reason, isUrgent: report.isUrgent },
    }),
  };
}

router.get("/admin/reports/stats", requireAdminPermission("reports"), async (req, res) => {
  const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
  await ensureSlaEscalationBeforeAdminRead();
  const counts = await getDomainQueueCounts(staff, "reports");
  return res.json(counts);
});

router.get("/admin/reports", requireAdminPermission("reports"), async (req, res) => {
  try {
    await ensureStaffWorkflowSchema();
    const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
    const queueRaw = String(req.query.queue || "").trim();
    const queue = isOpsQueueKey(queueRaw) ? queueRaw : null;
    const actorId = staff.actorAdminId;
    const { page, pageSize, offset } = parseAdminPageQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADMIN_REPORTS,
    );
    const reportReporter = alias(usersTable, "admin_reports_list_reporter");
    const reportAdOwner = alias(usersTable, "admin_reports_list_ad_owner");
    const reportTargetUser = alias(usersTable, "admin_reports_list_target_user");

    const { buildQueueSql } = await import("../lib/admin-operations-queue");
    const queueFilter =
      queue && queue !== "all"
        ? sql`${reportsTable.id} IN (SELECT r.id FROM reports r WHERE ${buildQueueSql("reports", queue, actorId, "r")})`
        : sql`${reportsTable.status} IN ('open', 'under_review', 'pending', 'in_review')`;

    const listWhere = and(sql`${queueFilter}`);

    const [countRow] = await db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(listWhere);
    const totalItems = Number(countRow?.value ?? 0);

    const reports = await db
      .select({
        id: reportsTable.id,
        reporterId: reportsTable.reporterId,
        reporterName: reportReporter.name,
        reporterEmail: reportReporter.email,
        reporterAvatarUrl: reportReporter.avatarUrl,
        targetUserId: reportsTable.targetUserId,
        targetAdId: reportsTable.targetAdId,
        relatedConversationId: reportsTable.relatedConversationId,
        reason: reportsTable.reason,
        description: reportsTable.description,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
        slaDueAt: sql<Date | null>`reports.sla_due_at`,
        isUrgent: sql<boolean>`COALESCE(reports.is_urgent, false)`,
        assignedStaffId: reportsTable.assignedStaffId,
        assignedAt: reportsTable.assignedAt,
        assignedByAdminId: reportsTable.assignedByAdminId,
        targetAdTitle: adsTable.title,
        targetAdSellerName: adsTable.sellerName,
        targetAdOwnerAvatarUrl: reportAdOwner.avatarUrl,
        targetAdOwnerName: reportAdOwner.name,
        targetProfileName: reportTargetUser.name,
        targetProfileAvatarUrl: reportTargetUser.avatarUrl,
      })
      .from(reportsTable)
      .leftJoin(reportReporter, eq(reportReporter.id, reportsTable.reporterId))
      .leftJoin(adsTable, eq(adsTable.id, reportsTable.targetAdId))
      .leftJoin(reportAdOwner, eq(reportAdOwner.id, adsTable.userId))
      .leftJoin(reportTargetUser, eq(reportTargetUser.id, reportsTable.targetUserId))
      .where(listWhere)
      .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id))
      .limit(pageSize)
      .offset(offset);

    const mapped = await Promise.all(reports.map((row) => mapReportRow(row)));
    const meta = buildAdminPageMeta(page, pageSize, totalItems);
    return sendJsonAdminPage(res, mapped, meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.patch("/admin/reports/:id/status", requireAdminPermission("reports"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const statusRaw = String(req.body?.status || "").trim();
  const status = normalizeReportStatus(statusRaw);
  if (!status || !isAllowedReportStatus(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const reasonContext =
    status === "rejected" ? "report_reject" : status === "resolved" ? "report_close" : null;
  let moderationReason = "";
  if (reasonContext) {
    const parsed = parseModerationReason(req.body?.reason, reasonContext);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    moderationReason = parsed.reason;
  }

  const [before] = await db
    .select({
      id: reportsTable.id,
      reporterId: reportsTable.reporterId,
      status: reportsTable.status,
      targetAdId: reportsTable.targetAdId,
      targetUserId: reportsTable.targetUserId,
      relatedConversationId: reportsTable.relatedConversationId,
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
    .returning({ id: reportsTable.id, status: reportsTable.status });

  const actionKey = reportAdminActivityAction(status);

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey,
    targetType: "report",
    targetId: id,
    previousState: before.status,
    newState: status,
    reason: moderationReason || null,
    deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
  });

  const payload = reportStatusNotificationPayload(status);
  if (before.reporterId) {
    try {
      const body =
        moderationReason && (status === "rejected" || status === "resolved")
          ? `${payload?.body ?? "تحديث على بلاغك"} — ${moderationReason}`
          : payload?.body ?? "تحديث على بلاغك";
      await createNotification({
        userId: before.reporterId,
        type: payload?.type ?? "report.updated",
        title: payload?.title ?? "تحديث حالة البلاغ",
        body,
        entityType: "report",
        entityId: id,
        metadata: {
          reportId: id,
          fromStatus: before.status,
          toStatus: status,
          reason: moderationReason || null,
        },
      });
    } catch (err) {
      logger.warn({ err, reportId: id, status }, "createNotification failed (admin report status)");
    }
  }

  return res.json({
    ...okAdminActionFeedback({
      title: "تم تحديث حالة البلاغ",
      description: `البلاغ #${id} — الحالة: ${status}`,
      nextStep: "تم إشعار المُبلّغ إن وُجد.",
      auditActivityId,
    }),
    ...updated[0],
  });
});

router.post("/admin/reports/:id/ad-action", requireAdminPermission("reports"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  const action = String(req.body?.action || "").trim();
  if (!["hide", "delete"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const parsed = parseModerationReason(req.body?.reason, "report_close");
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const reportRows = await db
    .select({
      id: reportsTable.id,
      targetAdId: reportsTable.targetAdId,
      status: reportsTable.status,
      reporterId: reportsTable.reporterId,
    })
    .from(reportsTable)
    .where(eq(reportsTable.id, id))
    .limit(1);
  const report = reportRows[0];
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (!report.targetAdId) return res.status(400).json({ error: "Report is not related to an ad" });

  const [targetAd] = await db
    .select({ id: adsTable.id, userId: adsTable.userId, status: adsTable.status })
    .from(adsTable)
    .where(eq(adsTable.id, report.targetAdId))
    .limit(1);

  if (action === "hide") {
    await db.update(adsTable).set({ status: "hidden" }).where(eq(adsTable.id, report.targetAdId));
    if (targetAd?.userId) {
      try {
        await createNotification({
          userId: targetAd.userId,
          type: "ad.hidden",
          title: "تم إخفاء إعلانك",
          body: `تم إخفاء إعلانك — ${parsed.reason}`,
          entityType: "ad",
          entityId: targetAd.id,
          metadata: { adId: targetAd.id, reason: parsed.reason },
        });
      } catch (err) {
        logger.warn({ err, adId: targetAd.id }, "createNotification failed (ad.hidden from report)");
      }
    }
    await writeAdminAudit({
      req,
      actionKey: "ad.hide",
      targetType: "ad",
      targetId: report.targetAdId,
      previousState: targetAd?.status ?? null,
      newState: "hidden",
      reason: parsed.reason,
      deepLink: adminDeepLink(`/admin/ads?focusId=${report.targetAdId}`),
      extra: { reportId: id },
    });
  } else {
    await db.delete(adsTable).where(eq(adsTable.id, report.targetAdId));
    if (targetAd?.userId) {
      try {
        await createNotification({
          userId: targetAd.userId,
          type: "ad.deleted",
          title: "تم حذف إعلانك",
          body: `تم حذف إعلانك — ${parsed.reason}`,
          entityType: null,
          entityId: null,
          metadata: { adId: targetAd.id, reason: parsed.reason },
        });
      } catch (err) {
        logger.warn({ err, adId: targetAd.id }, "createNotification failed (ad.deleted from report)");
      }
    }
    await writeAdminAudit({
      req,
      actionKey: "ad.delete",
      targetType: "ad",
      targetId: report.targetAdId,
      previousState: targetAd?.status ?? null,
      newState: "deleted",
      reason: parsed.reason,
      deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
      extra: { reportId: id },
    });
  }

  await db.update(reportsTable).set({ status: "resolved" }).where(eq(reportsTable.id, id));

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "report.resolve",
    targetType: "report",
    targetId: id,
    previousState: report.status,
    newState: "resolved",
    reason: parsed.reason,
    deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
    extra: { via: "ad_action", adAction: action },
  });

  if (report.reporterId) {
    try {
      await createNotification({
        userId: report.reporterId,
        type: "report.resolved",
        title: "تحديث حالة البلاغ",
        body: `تم حل بلاغك — ${parsed.reason}`,
        entityType: "report",
        entityId: id,
        metadata: { reportId: id, reason: parsed.reason },
      });
    } catch (err) {
      logger.warn({ err, reportId: id }, "createNotification failed (report resolved from ad action)");
    }
  }

  return res.json({
    success: true,
    action,
    targetAdId: report.targetAdId,
    ...okAdminActionFeedback({
      title: action === "hide" ? "تم إخفاء الإعلان المُبلّغ عنه" : "تم حذف الإعلان المُبلّغ عنه",
      description: `البلاغ #${id} — ${parsed.reason}`,
      nextStep: "تم حل البلاغ وإشعار الأطراف المعنية.",
      auditActivityId,
    }),
  });
});

router.post("/admin/reports/:id/claim", requireAdminPermission("reports"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report id" });
  }
  const [row] = await db.select({ id: reportsTable.id }).from(reportsTable).where(eq(reportsTable.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Report not found" });

  try {
    const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
    await assertStaffCanClaim(staff, "reports");
    const assignment = await claimReport({ reportId: id, actorAdminId: getAdminActorId(req) });
    await writeAdminAudit({
      req,
      actionKey: "report.claim",
      targetType: "report",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
    });
    return res.json({ assignment });
  } catch (err) {
    if (err instanceof Error && (err.message === "STAFF_CLAIM_LIMIT_REACHED" || err.message === "STAFF_DOMAIN_CLAIM_LIMIT_REACHED")) {
      return res.status(409).json({
        error: "لا يمكن استلام المزيد من الطلبات حاليًا — تم بلوغ حد الحمل",
        code: err.message,
      });
    }
    throw err;
  }
});

router.post("/admin/reports/:id/assign", requireAdminPermission("reports"), requireAdminFounder(), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const staffId = Number(req.body?.staffId);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid report id" });
  if (!Number.isInteger(staffId) || staffId <= 0) return res.status(400).json({ error: "Invalid staffId" });

  try {
    const assignment = await assignReport({
      reportId: id,
      staffId,
      actorAdminId: getAdminActorId(req),
    });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "report.assign",
      targetType: "report",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
      extra: { staffId },
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم إسناد البلاغ",
        description: `أُسند البلاغ #${id} إلى ${assignment.staffName ?? "الموظف"}.`,
        nextStep: "سيظهر في طابور الموظف المُسند.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (err instanceof FounderProtectedError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.post("/admin/reports/:id/release", requireAdminPermission("reports"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid report id" });

  const assignment = await releaseReport(id);
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "report.release",
    targetType: "report",
    targetId: id,
    deepLink: adminDeepLink(`/admin/reports?reportId=${id}`),
  });
  return res.json({
    assignment,
    ...okAdminActionFeedback({
      title: "تم إلغاء إسناد البلاغ",
      description: `البلاغ #${id} أصبح غير مُسند`,
      nextStep: "يمكن لموظف آخر استلامه من الطابور.",
      auditActivityId,
    }),
  });
});

export default router;

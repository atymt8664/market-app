import { Router } from "express";
import { adminDeepLink, writeAdminAudit } from "../lib/admin-audit";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { getAdminActorId } from "../lib/admin-activity-log";
import { parseModerationReason } from "../lib/admin-moderation-reason";
import {
  canAccessVerificationArea,
  claimVerificationRequest,
  assignVerificationRequest,
  escalateVerificationRequest,
  getVerificationRequestDetail,
  getVerificationStats,
  isVerificationStatus,
  listVerificationRequests,
  releaseVerificationRequest,
  updateVerificationRequestStatus,
} from "../lib/admin-verification-workflow";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminFounder } from "../middlewares/require-admin-founder";
import {
  buildAdminPageMeta,
  handlePaginationError,
  PAGINATION,
  parseAdminPageQuery,
  sendJsonAdminPage,
} from "../lib/pagination";

const router = Router();

router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

async function requireVerificationArea(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const staff = await loadAdminStaffContext(req);
    if (!canAccessVerificationArea(staff)) {
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    }
    req.adminStaff = staff;
    return next();
  } catch (err) {
    return next(err);
  }
}

function handleRbacError(err: unknown, res: import("express").Response): boolean {
  if (err instanceof Error && err.message === "RBAC_DENIED") {
    res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    return true;
  }
  return false;
}

router.get("/admin/verification/stats", requireVerificationArea, async (req, res) => {
  const stats = await getVerificationStats(req.adminStaff!);
  return res.json(stats);
});

router.get("/admin/verification/requests", requireVerificationArea, async (req, res) => {
  try {
    const queue = typeof req.query.queue === "string" ? req.query.queue : null;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const { page, pageSize, offset } = parseAdminPageQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADMIN_VERIFICATION,
    );
    const { items, totalItems } = await listVerificationRequests({
      ctx: req.adminStaff!,
      queue,
      status,
      limit: pageSize,
      offset,
    });
    const meta = buildAdminPageMeta(page, pageSize, totalItems);
    return sendJsonAdminPage(res, items, meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/admin/verification/requests/:id", requireVerificationArea, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid request id" });
  }
  const detail = await getVerificationRequestDetail({ ctx: req.adminStaff!, id });
  if (!detail) {
    return res.status(404).json({ error: "Verification request not found" });
  }
  return res.json(detail);
});

router.post("/admin/verification/requests/:id/claim", requireVerificationArea, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid request id" });
  }
  try {
    const assignment = await claimVerificationRequest({ ctx: req.adminStaff!, id });
    if (!assignment) return res.status(404).json({ error: "Verification request not found" });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "verification.claim",
      targetType: "verification_request",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/verification?requestId=${id}`),
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم استلام طلب التوثيق",
        description: `أصبحت مسؤولاً عن الطلب #${id}`,
        nextStep: "راجع المستندات واتخذ قراراً.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (handleRbacError(err, res)) return;
    if (err instanceof Error && (err.message === "STAFF_CLAIM_LIMIT_REACHED" || err.message === "STAFF_DOMAIN_CLAIM_LIMIT_REACHED")) {
      return res.status(409).json({
        error: "لا يمكن استلام المزيد من طلبات التوثيق حاليًا — تم بلوغ حد الحمل",
        code: err.message,
      });
    }
    throw err;
  }
});

router.post("/admin/verification/requests/:id/assign", requireVerificationArea, requireAdminFounder(), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const staffId = Number(req.body?.staffId);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid request id" });
  if (!Number.isInteger(staffId) || staffId <= 0) return res.status(400).json({ error: "Invalid staffId" });

  try {
    const assignment = await assignVerificationRequest({ ctx: req.adminStaff!, id, staffId });
    if (!assignment) return res.status(404).json({ error: "Verification request not found" });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "verification.assign",
      targetType: "verification_request",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/verification?requestId=${id}`),
      extra: { staffId },
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم إسناد طلب التوثيق",
        description: `أُسند الطلب #${id} إلى ${assignment.staffName ?? "الموظف"}.`,
        nextStep: "سيظهر في طابور الموظف المُسند.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (handleRbacError(err, res)) return;
    throw err;
  }
});

router.post("/admin/verification/requests/:id/release", requireVerificationArea, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid request id" });

  try {
    const assignment = await releaseVerificationRequest({ ctx: req.adminStaff!, id });
    if (!assignment) return res.status(404).json({ error: "Verification request not found" });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "verification.release",
      targetType: "verification_request",
      targetId: id,
      deepLink: adminDeepLink(`/admin/verification?requestId=${id}`),
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم إلغاء إسناد طلب التوثيق",
        description: `الطلب #${id} أصبح غير مُسند`,
        nextStep: "يمكن لموظف آخر استلامه من الطابور.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (handleRbacError(err, res)) return;
    throw err;
  }
});

router.post("/admin/verification/requests/:id/escalate", requireVerificationArea, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid request id" });
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : null;

  try {
    const ok = await escalateVerificationRequest({ ctx: req.adminStaff!, id, note });
    if (!ok) return res.status(404).json({ error: "Verification request not found" });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "verification.escalate",
      targetType: "verification_request",
      targetId: id,
      reason: note,
      deepLink: adminDeepLink(`/admin/verification?requestId=${id}&queue=escalation`),
    });
    return res.json({
      success: true,
      ...okAdminActionFeedback({
        title: "تم تصعيد طلب التوثيق",
        description: `أُرسل الطلب #${id} إلى فريق الإشراف.`,
        nextStep: "راجع طابور التصعيد للمتابعة.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (handleRbacError(err, res)) return;
    throw err;
  }
});

router.patch("/admin/verification/requests/:id/status", requireVerificationArea, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid request id" });

  const statusRaw = String(req.body?.status || "").trim();
  if (!isVerificationStatus(statusRaw)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  let reason: string | undefined;
  if (statusRaw === "rejected") {
    const parsed = parseModerationReason(req.body?.reason, "verification_reject");
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    reason = parsed.reason;
  }

  const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;

  try {
    const before = await getVerificationRequestDetail({ ctx: req.adminStaff!, id });
    if (!before) return res.status(404).json({ error: "Verification request not found" });

    const updated = await updateVerificationRequestStatus({
      ctx: req.adminStaff!,
      id,
      status: statusRaw,
      reason,
      notes,
    });
    if (!updated) return res.status(404).json({ error: "Verification request not found" });

    const actionKey =
      statusRaw === "approved"
        ? "verification.approve"
        : statusRaw === "rejected"
          ? "verification.reject"
          : statusRaw === "needs_info"
            ? "verification.needs_info"
            : "verification.status";

    const auditActivityId = await writeAdminAudit({
      req,
      actionKey,
      targetType: "verification_request",
      targetId: id,
      previousState: before.status,
      newState: statusRaw,
      reason: reason ?? null,
      deepLink: adminDeepLink(`/admin/verification?requestId=${id}`),
    });

    if (statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "needs_info") {
      try {
        const titles: Record<string, string> = {
          approved: "تم قبول طلب التوثيق",
          rejected: "تم رفض طلب التوثيق",
          needs_info: "مطلوب معلومات إضافية للتوثيق",
        };
        const bodies: Record<string, string> = {
          approved: "تم قبول طلب توثيق حسابك.",
          rejected: reason ? `تم رفض طلب التوثيق — ${reason}` : "تم رفض طلب التوثيق.",
          needs_info: notes?.trim()
            ? `نحتاج معلومات إضافية — ${notes.trim()}`
            : "نحتاج معلومات إضافية لإكمال التوثيق.",
        };
        await createNotification({
          userId: updated.userId,
          type: `verification.${statusRaw}`,
          title: titles[statusRaw] ?? "تحديث التوثيق",
          body: bodies[statusRaw] ?? "تحديث على طلب التوثيق",
          entityType: "verification_request",
          entityId: id,
          metadata: { requestId: id, status: statusRaw, reason: reason ?? null },
        });
      } catch (err) {
        logger.warn({ err, requestId: id, status: statusRaw }, "createNotification failed (verification status)");
      }
    }

    const detail = await getVerificationRequestDetail({ ctx: req.adminStaff!, id });
    const statusTitles: Record<string, string> = {
      approved: "تم قبول طلب التوثيق",
      rejected: "تم رفض طلب التوثيق",
      needs_info: "طُلبت معلومات إضافية",
      under_review: "تم تحديث حالة الطلب",
      pending: "تم تحديث حالة الطلب",
    };
    return res.json({
      ...okAdminActionFeedback({
        title: statusTitles[statusRaw] ?? "تم تحديث طلب التوثيق",
        description: `الطلب #${id} — ${statusRaw}`,
        nextStep: "تم إشعار المستخدم بالقرار.",
        auditActivityId,
      }),
      ...detail,
    });
  } catch (err) {
    if (handleRbacError(err, res)) return;
    throw err;
  }
});

export default router;

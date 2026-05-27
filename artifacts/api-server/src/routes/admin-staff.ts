import { Router } from "express";
import { getAdminActorId } from "../lib/admin-activity-log";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { adminDeepLink, writeAdminAudit } from "../lib/admin-audit";
import {
  ADMIN_DEPARTMENTS,
  DEPARTMENT_ROLE_MAP,
  FounderProtectedError,
  type AdminDepartmentKey,
  type AdminRoleKey,
  type AdminStaffStatus,
} from "../lib/admin-staff";
import {
  changeStaffPassword,
  hashStaffPassword,
  validateStaffPassword,
} from "../lib/admin-staff-auth";
import {
  createAdminStaff,
  getAdminStaffById,
  listAdminStaff,
  listAdminStaffActivity,
  listAdminStaffSessions,
  revokeAdminStaffSessions,
  updateAdminStaff,
} from "../lib/admin-staff-management";
import {
  requireAdmin,
  requireAdminAccessGrant,
  requireAdminCsrf,
  isAdminPasswordChangeExemptPath,
} from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import {
  buildAdminPageMeta,
  handlePaginationError,
  PAGINATION,
  parseAdminPageQuery,
  sendJsonAdminPage,
} from "../lib/pagination";

const router = Router();

router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

router.get("/admin/staff/meta", requireAdminPermission("staff"), async (_req, res) => {
  const departments = ADMIN_DEPARTMENTS.map((departmentKey) => ({
    key: departmentKey,
    labelKey: `p8.admin.staff.department.${departmentKey}`,
    roles: DEPARTMENT_ROLE_MAP[departmentKey].map((roleKey) => ({
      key: roleKey,
      labelKey: `p8.admin.roles.${roleKey}.title`,
    })),
  }));
  return res.json({ departments, founderProtected: true });
});

router.post(
  "/admin/staff/change-initial-password",
  requireAdminCsrf,
  async (req, res) => {
    if (!req.session?.isAdmin || req.session.adminMustChangePassword !== true) {
      return res.status(403).json({ error: "Password change not required" });
    }
    const actorId = getAdminActorId(req);
    if (actorId == null || actorId <= 1) {
      return res.status(403).json({ error: "Not a staff credential account" });
    }
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const confirmPassword =
      typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";
    if (!newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Password confirmation mismatch" });
    }
    if (!validateStaffPassword(newPassword)) {
      return res.status(400).json({ error: "Password does not meet requirements" });
    }
    const passwordHash = await hashStaffPassword(newPassword);
    await changeStaffPassword({
      adminActorId: actorId,
      newPasswordHash: passwordHash,
      clearMustChange: true,
    });
    req.session.adminMustChangePassword = false;
    await writeAdminAudit({
      req,
      actionKey: "staff.password_change",
      targetType: "system",
      targetId: actorId,
      previousState: "must_change",
      newState: "changed",
      deepLink: adminDeepLink("/admin/staff"),
    });
    return res.json({ ok: true });
  },
);

router.use((req, res, next) => {
  if (req.session?.adminMustChangePassword === true && !isAdminPasswordChangeExemptPath(req.path)) {
    return res.status(403).json({
      error: "Password change required before continuing",
      code: "ADMIN_PASSWORD_CHANGE_REQUIRED",
    });
  }
  return next();
});

router.get("/admin/staff", requireAdminPermission("staff"), async (req, res) => {
  try {
    const { page, pageSize, offset } = parseAdminPageQuery(
      req.query as Record<string, unknown>,
      PAGINATION.ADMIN_STAFF,
    );
    const { items, totalItems } = await listAdminStaff({ limit: pageSize, offset });
    const meta = buildAdminPageMeta(page, pageSize, totalItems);
    return sendJsonAdminPage(res, items, meta);
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/admin/staff/:id", requireAdminPermission("staff"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid staff id" });
  }
  const staff = await getAdminStaffById(id);
  if (!staff) return res.status(404).json({ error: "Staff member not found" });
  const sessions = await listAdminStaffSessions(staff.adminActorId, req.sessionID);
  const activity = await listAdminStaffActivity(staff.adminActorId, 40);
  return res.json({ staff, sessions, activity });
});

router.post("/admin/staff", requireAdminPermission("staff"), requireAdminCsrf, async (req, res) => {
  const displayName = String(req.body?.displayName || "").trim();
  const roleKey = String(req.body?.roleKey || "").trim().toLowerCase() as AdminRoleKey;
  const departmentKey = String(req.body?.departmentKey || "")
    .trim()
    .toLowerCase() as AdminDepartmentKey;
  const loginEmail =
    req.body?.loginEmail != null ? String(req.body.loginEmail).trim() : undefined;

  try {
    const created = await createAdminStaff({
      displayName,
      roleKey,
      departmentKey,
      loginEmail: loginEmail || undefined,
      createdByAdminActorId: getAdminActorId(req),
    });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "staff.create",
      targetType: "system",
      targetId: created.staff.adminActorId,
      previousState: null,
      newState: `${departmentKey}:${roleKey}`,
      reason: displayName,
      deepLink: adminDeepLink("/admin/staff"),
      extra: {
        staffRowId: created.staff.id,
        loginEmail: created.staff.loginEmail,
        departmentKey,
        roleKey,
      },
    });
    return res.status(201).json({
      staff: created.staff,
      temporaryPassword: created.temporaryPassword,
      oneTimeReveal: true,
      ...okAdminActionFeedback({
        title: "تم إنشاء حساب الموظف",
        description: `أُنشئ حساب «${displayName}».`,
        nextStep: "سلّم كلمة المرور المؤقتة للموظف لمرة واحدة.",
        auditActivityId,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return res.status(400).json({ error: message });
  }
});

router.patch("/admin/staff/:id", requireAdminPermission("staff"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid staff id" });
  }

  const before = await getAdminStaffById(id);
  if (!before) return res.status(404).json({ error: "Staff member not found" });

  const displayName =
    req.body?.displayName != null ? String(req.body.displayName).trim() : undefined;
  const roleKey =
    req.body?.roleKey != null
      ? (String(req.body.roleKey).trim().toLowerCase() as AdminRoleKey)
      : undefined;
  const departmentKey =
    req.body?.departmentKey != null
      ? (String(req.body.departmentKey).trim().toLowerCase() as AdminDepartmentKey)
      : undefined;
  const status =
    req.body?.status != null
      ? (String(req.body.status).trim().toLowerCase() as AdminStaffStatus)
      : undefined;

  try {
    const updated = await updateAdminStaff({
      staffRowId: id,
      displayName,
      roleKey,
      departmentKey,
      status,
    });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "staff.update",
      targetType: "system",
      targetId: updated.adminActorId,
      previousState: `${before.departmentKey}:${before.roleKey}:${before.status}`,
      newState: `${updated.departmentKey}:${updated.roleKey}:${updated.status}`,
      deepLink: adminDeepLink("/admin/staff"),
      extra: { staffRowId: id },
    });
    return res.json({
      ...okAdminActionFeedback({
        title: "تم تحديث بيانات الموظف",
        description: `حُدّث حساب «${updated.displayName}».`,
        nextStep: "قد يحتاج الموظف لتسجيل الدخول مجدداً إن تغيرت صلاحياته.",
        auditActivityId,
      }),
      ...updated,
    });
  } catch (error) {
    if (error instanceof FounderProtectedError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    const message = error instanceof Error ? error.message : "Update failed";
    return res.status(400).json({ error: message });
  }
});

router.post(
  "/admin/staff/:id/revoke-sessions",
  requireAdminPermission("staff"),
  requireAdminCsrf,
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid staff id" });
    }
    const staff = await getAdminStaffById(id);
    if (!staff) return res.status(404).json({ error: "Staff member not found" });

    try {
      const revoked = await revokeAdminStaffSessions(staff.adminActorId);
      const auditActivityId = await writeAdminAudit({
        req,
        actionKey: "staff.sessions_revoke",
        targetType: "system",
        targetId: staff.adminActorId,
        previousState: String(revoked),
        newState: "0",
        deepLink: adminDeepLink("/admin/staff"),
        extra: { staffRowId: id },
      });
      return res.json({
        ok: true,
        revoked,
        ...okAdminActionFeedback({
          title: "تم إنهاء جلسات الموظف",
          description: `أُنهيت ${revoked} جلسة لـ «${staff.displayName}».`,
          nextStep: "يجب على الموظف تسجيل الدخول مجدداً.",
          auditActivityId,
        }),
      });
    } catch (error) {
      if (error instanceof FounderProtectedError) {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      throw error;
    }
  },
);

router.get("/admin/staff/:id/activity", requireAdminPermission("staff"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid staff id" });
  }
  const staff = await getAdminStaffById(id);
  if (!staff) return res.status(404).json({ error: "Staff member not found" });
  const activity = await listAdminStaffActivity(staff.adminActorId, 100);
  return res.json(activity);
});

export default router;

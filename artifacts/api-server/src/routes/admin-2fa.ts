import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureAppSettingsTable } from "../lib/ensure-app-settings-table";
import { bumpAdminSecurityRevision, getAdminAuthSecuritySnapshot } from "../lib/admin-auth-settings";
import {
  requireAdmin,
  requireAdminAccessGrant,
  requireAdminCsrf,
} from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { generateBackupCodes, consumeBackupCodeIfValid } from "../lib/admin-backup-codes";
import { generateTotpSecret, verifyTotpCode, totpQrDataUrl } from "../lib/admin-totp";
import { ADMIN_2FA_SETUP_PENDING_MS, ADMIN_BACKUP_CODE_COUNT } from "../lib/admin-2fa-constants";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import type { Request } from "express";

const router: IRouter = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureAppSettingsTable();
    next();
  } catch (e) {
    next(e);
  }
});

router.use("/admin", requireAdminIpAllowlist);

function readSetupSecret(req: Request): string | null {
  const s = req.session?.admin2faSetupSecret;
  const exp = req.session?.admin2faSetupExpiresAt;
  if (typeof s !== "string" || s.length < 16) return null;
  if (typeof exp !== "number" || Date.now() > exp) return null;
  return s;
}

router.post(
  "/admin/2fa/setup/start",
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("settings"),
  requireAdminCsrf,
  async (req, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "currentPassword is required" });
    }

    const snap = await getAdminAuthSecuritySnapshot();
    if (!snap) {
      return res.status(500).json({ error: "Admin not configured" });
    }
    if (snap.admin2faEnabled) {
      return res.status(400).json({ error: "Two-factor authentication is already enabled" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.adminPasswordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const secret = generateTotpSecret();
    req.session.admin2faSetupSecret = secret;
    req.session.admin2faSetupExpiresAt = Date.now() + ADMIN_2FA_SETUP_PENDING_MS;

    return res.json({
      ok: true,
      ...okAdminActionFeedback({
        title: "بدء إعداد المصادقة الثنائية",
        description: "تم التحقق من كلمة المرور — امسح رمز QR في الخطوة التالية.",
        nextStep: "افتح GET /admin/2fa/setup/qr ثم أدخل رمز التطبيق.",
        auditActivityId: null,
      }),
    });
  },
);

router.get(
  "/admin/2fa/setup/qr",
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("settings"),
  async (req, res) => {
  const secret = readSetupSecret(req);
  if (!secret) {
    return res.status(400).json({ error: "No pending 2FA setup; start setup again" });
  }
  try {
    const qrDataUrl = await totpQrDataUrl(secret);
    return res.json({ qrDataUrl });
  } catch {
    return res.status(500).json({ error: "Failed to generate QR" });
  }
});

router.post(
  "/admin/2fa/setup/confirm",
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("settings"),
  requireAdminCsrf,
  async (req, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "currentPassword is required" });
    }
    if (!code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }

    const snap = await getAdminAuthSecuritySnapshot();
    if (!snap) {
      return res.status(500).json({ error: "Admin not configured" });
    }
    if (snap.admin2faEnabled) {
      return res.status(400).json({ error: "Two-factor authentication is already enabled" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.adminPasswordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const pendingSecret = readSetupSecret(req);
    if (!pendingSecret) {
      return res.status(400).json({ error: "No pending 2FA setup; start setup again" });
    }

    const totpOk = await verifyTotpCode(pendingSecret, code);
    if (!totpOk) {
      return res.status(401).json({ error: "رمز التحقق غير صحيح" });
    }

    const { plainCodes, payloadJson } = await generateBackupCodes(ADMIN_BACKUP_CODE_COUNT);

    await db
      .update(appSettingsTable)
      .set({
        admin2faSecret: pendingSecret,
        admin2faEnabled: true,
        admin2faEnabledAt: new Date(),
        adminBackupCodesHash: payloadJson,
        updatedAt: new Date(),
      })
      .where(eq(appSettingsTable.id, 1));

    const newRev = await bumpAdminSecurityRevision();

    req.session.admin2faSetupSecret = undefined;
    req.session.admin2faSetupExpiresAt = undefined;
    req.session.adminSecurityRevision = newRev;

    const auditActivityId = await logAdminActivity({
      action: "admin.2fa.enable",
      actorAdminId: getAdminActorId(req),
      targetType: "system",
      targetId: 1,
      details: { backupCodesIssued: String(ADMIN_BACKUP_CODE_COUNT) },
    });

    return res.json({
      ok: true,
      backupCodes: plainCodes,
      ...okAdminActionFeedback({
        title: "تم تفعيل المصادقة الثنائية",
        description: "حُفظت إعدادات 2FA — احفظ رموز النسخ الاحتياطي.",
        nextStep: "خزّن رموز النسخ الاحتياطي في مكان آمن.",
        auditActivityId,
      }),
    });
  },
);

router.post(
  "/admin/2fa/disable",
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("settings"),
  requireAdminCsrf,
  async (req, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "currentPassword is required" });
    }
    if (!code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }

    const snap = await getAdminAuthSecuritySnapshot();
    if (!snap) {
      return res.status(500).json({ error: "Admin not configured" });
    }
    if (!snap.admin2faEnabled || !snap.admin2faSecret) {
      return res.status(400).json({ error: "Two-factor authentication is not enabled" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.adminPasswordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    let verified = await verifyTotpCode(snap.admin2faSecret, code);
    if (!verified) {
      const consumed = await consumeBackupCodeIfValid(code, snap.adminBackupCodesHash);
      if (!consumed) {
        return res.status(401).json({ error: "رمز التحقق غير صحيحة" });
      }
      await db
        .update(appSettingsTable)
        .set({ adminBackupCodesHash: consumed, updatedAt: new Date() })
        .where(eq(appSettingsTable.id, 1));
      verified = true;
    }

    await db
      .update(appSettingsTable)
      .set({
        admin2faEnabled: false,
        admin2faSecret: null,
        admin2faEnabledAt: null,
        adminBackupCodesHash: null,
        updatedAt: new Date(),
      })
      .where(eq(appSettingsTable.id, 1));

    const newRev = await bumpAdminSecurityRevision();
    req.session.adminSecurityRevision = newRev;

    const auditActivityId = await logAdminActivity({
      action: "admin.2fa.disable",
      actorAdminId: getAdminActorId(req),
      targetType: "system",
      targetId: 1,
      details: {},
    });

    return res.json({
      ok: true,
      ...okAdminActionFeedback({
        title: "تم تعطيل المصادقة الثنائية",
        description: "أُزيلت 2FA من حساب المؤسس.",
        nextStep: "يمكنك إعادة التفعيل من الإعدادات في أي وقت.",
        auditActivityId,
      }),
    });
  },
);

export default router;

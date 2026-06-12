import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { ensureUser2faColumns } from "../lib/ensure-user-2fa-columns";
import {
  bumpUserSecurityRevision,
  getUser2faSecuritySnapshot,
  userHas2faEnabled,
} from "../lib/user-2fa-settings";
import {
  USER_2FA_SETUP_PENDING_MS,
  USER_BACKUP_CODE_COUNT,
} from "../lib/user-2fa-constants";
import { generateBackupCodes, consumeBackupCodeIfValid } from "../lib/admin-backup-codes";
import {
  generateUserTotpSecret,
  userTotpQrDataUrl,
  verifyUserTotpCode,
} from "../lib/user-totp";
import { logUserSecurityEvent } from "../lib/user-security-log";
import { listUserSecurityAlerts, listUserSecurityEvents } from "../lib/user-security-log";
import { ensureUserSecurityEventsTable } from "../lib/ensure-user-security-events-table";

const router: IRouter = Router();

const isDevApi = process.env.NODE_ENV !== "production";

const user2faSetupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevApi ? 40 : 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، انتظر قليلاً وحاول مجدداً" },
});

const user2faConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevApi ? 60 : 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، انتظر قليلاً وحاول مجدداً" },
});

router.use(async (_req, _res, next) => {
  try {
    await ensureUser2faColumns();
    await ensureUserSecurityEventsTable();
    next();
  } catch (e) {
    next(e);
  }
});

function readSetupSecret(req: Request): string | null {
  const s = req.session?.user2faSetupSecret;
  const exp = req.session?.user2faSetupExpiresAt;
  if (typeof s !== "string" || s.length < 16) return null;
  if (typeof exp !== "number" || Date.now() > exp) return null;
  return s;
}

router.get("/account/2fa/status", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const snap = await getUser2faSecuritySnapshot(userId);
  if (!snap) {
    return res.status(401).json({ error: "يرجى تسجيل الدخول" });
  }
  const enabled = userHas2faEnabled(snap);
  return res.json({
    enabled,
    enabledAt: snap.totpEnabledAt?.toISOString() ?? null,
    backupCodesRemaining: enabled
      ? (() => {
          try {
            const parsed = JSON.parse(snap.backupCodesHash ?? "{}") as { hashes?: unknown[] };
            return Array.isArray(parsed.hashes) ? parsed.hashes.length : 0;
          } catch {
            return 0;
          }
        })()
      : 0,
  });
});

router.post(
  "/account/2fa/setup/start",
  user2faSetupLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    }

    const snap = await getUser2faSecuritySnapshot(userId);
    if (!snap) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول" });
    }
    if (userHas2faEnabled(snap)) {
      return res.status(400).json({ error: "المصادقة الثنائية مفعّلة بالفعل" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const secret = generateUserTotpSecret();
    req.session.user2faSetupSecret = secret;
    req.session.user2faSetupExpiresAt = Date.now() + USER_2FA_SETUP_PENDING_MS;

    return res.json({ ok: true });
  },
);

router.get("/account/2fa/setup/qr", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const secret = readSetupSecret(req);
  if (!secret) {
    return res.status(400).json({ error: "لا يوجد إعداد معلّق — ابدأ من جديد" });
  }

  const snap = await getUser2faSecuritySnapshot(userId);
  if (!snap) {
    return res.status(401).json({ error: "يرجى تسجيل الدخول" });
  }

  try {
    const qrDataUrl = await userTotpQrDataUrl(secret, snap.email);
    return res.json({ qrDataUrl });
  } catch {
    return res.status(500).json({ error: "تعذر إنشاء رمز QR" });
  }
});

router.post(
  "/account/2fa/setup/confirm",
  user2faConfirmLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    }
    if (!code.trim()) {
      return res.status(400).json({ error: "رمز التحقق مطلوب" });
    }

    const snap = await getUser2faSecuritySnapshot(userId);
    if (!snap) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول" });
    }
    if (userHas2faEnabled(snap)) {
      return res.status(400).json({ error: "المصادقة الثنائية مفعّلة بالفعل" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const pendingSecret = readSetupSecret(req);
    if (!pendingSecret) {
      return res.status(400).json({ error: "لا يوجد إعداد معلّق — ابدأ من جديد" });
    }

    const totpOk = await verifyUserTotpCode(pendingSecret, code);
    if (!totpOk) {
      return res.status(401).json({ error: "رمز التحقق غير صحيح" });
    }

    const { plainCodes, payloadJson } = await generateBackupCodes(USER_BACKUP_CODE_COUNT);

    await db
      .update(usersTable)
      .set({
        totpSecret: pendingSecret,
        totpEnabled: true,
        totpEnabledAt: new Date(),
        backupCodesHash: payloadJson,
      })
      .where(eq(usersTable.id, userId));

    const newRev = await bumpUserSecurityRevision(userId);

    req.session.user2faSetupSecret = undefined;
    req.session.user2faSetupExpiresAt = undefined;
    req.session.userSecurityRevision = newRev;

    await logUserSecurityEvent(userId, "2fa.enable", req, {
      backupCodesIssued: USER_BACKUP_CODE_COUNT,
    });

    return res.json({ ok: true, backupCodes: plainCodes });
  },
);

router.post(
  "/account/2fa/disable",
  user2faConfirmLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!currentPassword) {
      return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    }
    if (!code.trim()) {
      return res.status(400).json({ error: "رمز التحقق مطلوب" });
    }

    const snap = await getUser2faSecuritySnapshot(userId);
    if (!snap) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول" });
    }
    if (!userHas2faEnabled(snap) || !snap.totpSecret) {
      return res.status(400).json({ error: "المصادقة الثنائية غير مفعّلة" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    let verified = await verifyUserTotpCode(snap.totpSecret, code);
    if (!verified) {
      const consumed = await consumeBackupCodeIfValid(code, snap.backupCodesHash);
      if (!consumed) {
        return res.status(401).json({ error: "رمز التحقق غير صحيح" });
      }
      await db
        .update(usersTable)
        .set({ backupCodesHash: consumed })
        .where(eq(usersTable.id, userId));
      verified = true;
    }

    await db
      .update(usersTable)
      .set({
        totpEnabled: false,
        totpSecret: null,
        totpEnabledAt: null,
        backupCodesHash: null,
      })
      .where(eq(usersTable.id, userId));

    const newRev = await bumpUserSecurityRevision(userId);
    req.session.userSecurityRevision = newRev;

    await logUserSecurityEvent(userId, "2fa.disable", req);

    return res.json({ ok: true });
  },
);

router.post(
  "/account/2fa/backup/regenerate",
  user2faConfirmLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!currentPassword || !code.trim()) {
      return res.status(400).json({ error: "كلمة المرور ورمز التحقق مطلوبان" });
    }

    const snap = await getUser2faSecuritySnapshot(userId);
    if (!snap?.totpSecret || !userHas2faEnabled(snap)) {
      return res.status(400).json({ error: "المصادقة الثنائية غير مفعّلة" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, snap.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const totpOk = await verifyUserTotpCode(snap.totpSecret, code);
    if (!totpOk) {
      return res.status(401).json({ error: "رمز التحقق غير صحيح" });
    }

    const { plainCodes, payloadJson } = await generateBackupCodes(USER_BACKUP_CODE_COUNT);
    await db
      .update(usersTable)
      .set({ backupCodesHash: payloadJson })
      .where(eq(usersTable.id, userId));

    await logUserSecurityEvent(userId, "2fa.backup_regenerate", req);

    return res.json({ ok: true, backupCodes: plainCodes });
  },
);

router.get("/account/security-log", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const beforeRaw = req.query.before;
  const beforeId =
    typeof beforeRaw === "string" && /^\d+$/.test(beforeRaw) ? Number(beforeRaw) : undefined;
  const events = await listUserSecurityEvents(userId, { limit: 50, beforeId });
  return res.json({ events });
});

router.get("/account/security-alerts", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const beforeRaw = req.query.before;
  const beforeId =
    typeof beforeRaw === "string" && /^\d+$/.test(beforeRaw) ? Number(beforeRaw) : undefined;
  const alerts = await listUserSecurityAlerts(userId, { limit: 40, beforeId });
  return res.json({ alerts });
});

export default router;

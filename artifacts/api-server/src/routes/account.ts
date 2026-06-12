import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable, notificationPreferencesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import {
  collectUploadsPathsForUserAccount,
  deleteUserAccountInTransaction,
} from "../lib/account-deletion";
import { routeAccountDeletionStoragePurge } from "../lib/purge-outbox";
import { getSessionClearCookieOptions, SESSION_COOKIE_NAME } from "../lib/session-cookie";
import { logger } from "../lib/logger";
import { listBlockedUsersForMe } from "../lib/list-blocked-users";
import { getUnreadCounters } from "../lib/notifications/counters";
import {
  listUserSessions,
  revokeOtherUserSessions,
  revokeUserSession,
} from "../lib/user-sessions";
import { listUserDevices, revokeUserDevice } from "../lib/user-devices";
import { logUserSecurityEvent } from "../lib/user-security-log";
import { ensureUserPrivacyColumns } from "../lib/ensure-user-privacy-columns";

const router: IRouter = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureUserPrivacyColumns();
    next();
  } catch (e) {
    next(e);
  }
});

const isDevApi = process.env.NODE_ENV !== "production";

const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevApi ? 40 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة لحذف الحساب، حاول لاحقاً" },
});

const sessionRevokeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevApi ? 60 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، انتظر قليلاً وحاول مجدداً" },
});

const SessionIdParam = z
  .string()
  .min(8, "معرّف الجلسة غير صالح")
  .max(256, "معرّف الجلسة غير صالح")
  .regex(/^[a-zA-Z0-9._-]+$/, "معرّف الجلسة غير صالح");

const DeviceIdParam = z.coerce.number().int().positive("معرّف الجهاز غير صالح");

const DeleteAccountBody = z.object({
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const HmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "وقت غير صالح");

const NotificationPreferencesPatchBody = z
  .object({
    notifyMessages: z.boolean().optional(),
    notifyAdModeration: z.boolean().optional(),
    notifySupport: z.boolean().optional(),
    notifyReports: z.boolean().optional(),
    notifyAnnouncements: z.boolean().optional(),
    notifyFavorites: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: HmSchema.optional(),
    quietHoursEnd: HmSchema.optional(),
    quietHoursTimezone: z.string().min(1).max(64).optional(),
  })
  .strict();

const defaultNotificationPrefs = {
  notifyMessages: true,
  notifyAdModeration: true,
  notifySupport: true,
  notifyReports: true,
  notifyAnnouncements: true,
  notifyFavorites: true,
  pushEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  quietHoursTimezone: "Europe/Berlin",
} as const;

function serializeNotificationPrefs(row: {
  notifyMessages: boolean;
  notifyAdModeration: boolean;
  notifySupport: boolean;
  notifyReports: boolean;
  notifyAnnouncements: boolean;
  notifyFavorites: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
}) {
  return {
    notifyMessages: row.notifyMessages,
    notifyAdModeration: row.notifyAdModeration,
    notifySupport: row.notifySupport,
    notifyReports: row.notifyReports,
    notifyAnnouncements: row.notifyAnnouncements,
    notifyFavorites: row.notifyFavorites,
    pushEnabled: row.pushEnabled,
    quietHoursEnabled: row.quietHoursEnabled,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    quietHoursTimezone: row.quietHoursTimezone,
  };
}

function isPgUndefinedTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "42P01"
  );
}

router.get("/account/unread-counters", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const counters = await getUnreadCounters(userId);
  res.json(counters);
});

router.get("/account/blocked-users", requireAuth, async (req, res) => {
  await listBlockedUsersForMe(req.session.userId!, req.query as Record<string, unknown>, res);
});

router.get("/account/sessions", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const sessions = await listUserSessions(userId, req.sessionID);
  res.json({ sessions });
});

router.delete(
  "/account/sessions/others",
  sessionRevokeLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const currentSessionId = req.sessionID;
    if (!currentSessionId) {
      res.status(400).json({ error: "تعذر تحديد الجلسة الحالية" });
      return;
    }
    const revoked = await revokeOtherUserSessions(userId, currentSessionId);
    await logUserSecurityEvent(userId, "session.revoke_others", req, { revoked });
    res.json({ ok: true, revoked });
  },
);

router.delete(
  "/account/sessions/:sessionId",
  sessionRevokeLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const parsed = SessionIdParam.safeParse(req.params.sessionId);
    if (!parsed.success) {
      res.status(400).json({ error: "معرّف الجلسة غير صالح" });
      return;
    }
    const outcome = await revokeUserSession(userId, parsed.data, req.sessionID);
    if (outcome === "current_forbidden") {
      res.status(400).json({
        error: "لا يمكن إنهاء الجلسة الحالية من هنا — استخدم تسجيل الخروج",
        code: "CURRENT_SESSION",
      });
      return;
    }
    if (outcome === "not_found") {
      res.status(404).json({ error: "الجلسة غير موجودة أو منتهية" });
      return;
    }
    await logUserSecurityEvent(userId, "session.revoke", req, {
      sessionId: parsed.data,
    });
    res.status(200).json({ ok: true });
  },
);

router.get("/account/devices", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const rawUa = req.headers["user-agent"];
  const userAgent = typeof rawUa === "string" ? rawUa : null;
  const devices = await listUserDevices(userId, userAgent);
  res.json({ devices });
});

router.delete(
  "/account/devices/:deviceId",
  sessionRevokeLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    const userId = req.session.userId!;
    const parsed = DeviceIdParam.safeParse(req.params.deviceId);
    if (!parsed.success) {
      res.status(400).json({ error: "معرّف الجهاز غير صالح" });
      return;
    }
    const outcome = await revokeUserDevice(userId, parsed.data);
    if (outcome === "not_found") {
      res.status(404).json({ error: "الجهاز غير موجود" });
      return;
    }
    await logUserSecurityEvent(userId, "device.revoke", req, { deviceId: parsed.data });
    res.status(200).json({ ok: true });
  },
);

const PrivacyPreferencesPatchBody = z
  .object({
    showActivityStatus: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
  })
  .strict();

const defaultPrivacyPrefs = {
  showActivityStatus: true,
  showLastSeen: true,
} as const;

router.get("/account/privacy-preferences", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const [row] = await db
    .select({
      presenceActivityVisible: usersTable.presenceActivityVisible,
      presenceLastSeenVisible: usersTable.presenceLastSeenVisible,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!row) {
    return res.status(401).json({ error: "يرجى تسجيل الدخول" });
  }
  return res.json({
    showActivityStatus: row.presenceActivityVisible,
    showLastSeen: row.presenceLastSeenVisible,
  });
});

router.patch("/account/privacy-preferences", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const parsed = PrivacyPreferencesPatchBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "بيانات غير صحيحة" });
  }
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "لا توجد حقول للتحديث" });
  }

  const [existing] = await db
    .select({
      presenceActivityVisible: usersTable.presenceActivityVisible,
      presenceLastSeenVisible: usersTable.presenceLastSeenVisible,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!existing) {
    return res.status(401).json({ error: "يرجى تسجيل الدخول" });
  }

  const nextPrefs = {
    showActivityStatus: existing.presenceActivityVisible,
    showLastSeen: existing.presenceLastSeenVisible,
    ...patch,
  };

  await db
    .update(usersTable)
    .set({
      presenceActivityVisible: nextPrefs.showActivityStatus,
      presenceLastSeenVisible: nextPrefs.showLastSeen,
    })
    .where(eq(usersTable.id, userId));

  return res.json(nextPrefs);
});

router.get("/account/notification-preferences", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const [row] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    if (!row) {
      return res.json({ ...defaultNotificationPrefs });
    }

    return res.json(serializeNotificationPrefs(row));
  } catch (err) {
    if (isPgUndefinedTableError(err)) {
      logger.warn({ err }, "notification_preferences: table missing (run prepareDatabase / migration 006)");
      return res.status(503).json({
        error:
          "إعدادات الإشعارات غير متاحة مؤقتًا. طبّق تحديث قاعدة البيانات ثم أعد تشغيل الخادم.",
        code: "NOTIFICATION_PREFS_SCHEMA_MISSING",
      });
    }
    return next(err);
  }
});

router.patch("/account/notification-preferences", requireAuth, requireUserCsrf, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const parsed = NotificationPreferencesPatchBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "بيانات غير صحيحة" });
    }
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "لا توجد حقول للتحديث" });
    }

    const [existing] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    const nextPrefs = {
      ...defaultNotificationPrefs,
      ...(existing ? serializeNotificationPrefs(existing) : {}),
      ...patch,
    };

    await db
      .insert(notificationPreferencesTable)
      .values({
        userId,
        notifyMessages: nextPrefs.notifyMessages,
        notifyAdModeration: nextPrefs.notifyAdModeration,
        notifySupport: nextPrefs.notifySupport,
        notifyReports: nextPrefs.notifyReports,
        notifyAnnouncements: nextPrefs.notifyAnnouncements,
        notifyFavorites: nextPrefs.notifyFavorites,
        pushEnabled: nextPrefs.pushEnabled,
        quietHoursEnabled: nextPrefs.quietHoursEnabled,
        quietHoursStart: nextPrefs.quietHoursStart,
        quietHoursEnd: nextPrefs.quietHoursEnd,
        quietHoursTimezone: nextPrefs.quietHoursTimezone,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferencesTable.userId,
        set: {
          notifyMessages: nextPrefs.notifyMessages,
          notifyAdModeration: nextPrefs.notifyAdModeration,
          notifySupport: nextPrefs.notifySupport,
          notifyReports: nextPrefs.notifyReports,
          notifyAnnouncements: nextPrefs.notifyAnnouncements,
          notifyFavorites: nextPrefs.notifyFavorites,
          pushEnabled: nextPrefs.pushEnabled,
          quietHoursEnabled: nextPrefs.quietHoursEnabled,
          quietHoursStart: nextPrefs.quietHoursStart,
          quietHoursEnd: nextPrefs.quietHoursEnd,
          quietHoursTimezone: nextPrefs.quietHoursTimezone,
          updatedAt: new Date(),
        },
      });

    return res.json(nextPrefs);
  } catch (err) {
    if (isPgUndefinedTableError(err)) {
      logger.warn({ err }, "notification_preferences: table missing (run prepareDatabase / migration 006)");
      return res.status(503).json({
        error:
          "إعدادات الإشعارات غير متاحة مؤقتًا. طبّق تحديث قاعدة البيانات ثم أعد تشغيل الخادم.",
        code: "NOTIFICATION_PREFS_SCHEMA_MISSING",
      });
    }
    return next(err);
  }
});

router.post(
  "/account/delete",
  deleteAccountLimiter,
  requireAuth,
  requireUserCsrf,
  async (req, res) => {
    if (req.session.isAdmin === true) {
      res.status(403).json({ error: "لا يمكن حذف الحساب أثناء جلسة الإدارة" });
      return;
    }

    const userId = req.session.userId!;
    const parsed = DeleteAccountBody.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? "بيانات غير صحيحة";
      res.status(400).json({ error: msg });
      return;
    }
    const password = parsed.data.password;

    const [user] = await db
      .select({
        id: usersTable.id,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      req.session.destroy(() => {
        res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
        res.status(200).json({ ok: true, alreadyDeleted: true });
      });
      return;
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }

    let storagePaths: string[] = [];
    try {
      storagePaths = await collectUploadsPathsForUserAccount(userId);
    } catch (err) {
      logger.warn({ err, userId }, "account delete: collect storage paths failed (continuing with DB delete)");
    }

    let deleted = false;
    try {
      deleted = await deleteUserAccountInTransaction(userId);
    } catch (err) {
      logger.error({ err, userId }, "account delete: transaction failed");
      res.status(500).json({ error: "تعذر إكمال حذف الحساب" });
      return;
    }

    await routeAccountDeletionStoragePurge(userId, storagePaths);

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        logger.warn({ err: destroyErr, userId }, "account delete: session.destroy failed");
      }
      res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
      res.status(200).json({
        ok: true,
        deleted,
        alreadyDeleted: !deleted,
      });
    });
  },
);

export default router;

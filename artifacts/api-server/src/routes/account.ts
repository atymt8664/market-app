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
  runBestEffortStorageCleanupForUser,
} from "../lib/account-deletion";
import { getSessionClearCookieOptions, SESSION_COOKIE_NAME } from "../lib/session-cookie";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const isDevApi = process.env.NODE_ENV !== "production";

const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevApi ? 40 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة لحذف الحساب، حاول لاحقاً" },
});

const DeleteAccountBody = z.object({
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const NotificationPreferencesPatchBody = z
  .object({
    notifyMessages: z.boolean().optional(),
    notifyAdModeration: z.boolean().optional(),
    notifySupport: z.boolean().optional(),
    notifyReports: z.boolean().optional(),
    notifyAnnouncements: z.boolean().optional(),
  })
  .strict();

const defaultNotificationPrefs = {
  notifyMessages: true,
  notifyAdModeration: true,
  notifySupport: true,
  notifyReports: true,
  notifyAnnouncements: true,
} as const;

function isPgUndefinedTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "42P01"
  );
}

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

    return res.json({
      notifyMessages: row.notifyMessages,
      notifyAdModeration: row.notifyAdModeration,
      notifySupport: row.notifySupport,
      notifyReports: row.notifyReports,
      notifyAnnouncements: row.notifyAnnouncements,
    });
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
      ...(existing
        ? {
            notifyMessages: existing.notifyMessages,
            notifyAdModeration: existing.notifyAdModeration,
            notifySupport: existing.notifySupport,
            notifyReports: existing.notifyReports,
            notifyAnnouncements: existing.notifyAnnouncements,
          }
        : {}),
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

    await runBestEffortStorageCleanupForUser(userId, storagePaths);

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

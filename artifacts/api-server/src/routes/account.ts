import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/require-auth";
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

router.post("/account/delete", deleteAccountLimiter, requireAuth, async (req, res) => {
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
});

export default router;

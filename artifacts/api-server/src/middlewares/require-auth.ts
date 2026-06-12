import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getSessionClearCookieOptions, SESSION_COOKIE_NAME } from "../lib/session-cookie";
import { logger } from "../lib/logger";
import { isUserSecurityRevisionStale } from "../lib/user-security-revision";

/** Matches JSON returned by login and enforced-session endpoints when user is banned */
export const ACCOUNT_DISABLED_MESSAGE = "تم تعطيل هذا الحساب من قبل الإدارة";
export const ACCOUNT_DISABLED_CODE = "ACCOUNT_DISABLED" as const;

export function destroySessionRespondBanned(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      logger.warn({ err }, "session.destroy failed while rejecting banned user");
    }
    res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
    res.status(403).json({
      error: ACCOUNT_DISABLED_MESSAGE,
      code: ACCOUNT_DISABLED_CODE,
    });
  });
}

/**
 * Requires a logged-in user whose account is not banned.
 * Destroys the session and clears the cookie when the user is banned or missing.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "يرجى تسجيل الدخول" });
        return;
      }
      const userId = req.session.userId;
      const [row] = await db
        .select({
          isBanned: usersTable.isBanned,
          securityRevision: usersTable.securityRevision,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!row) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            logger.warn({ err: destroyErr, userId }, "session.destroy failed for missing user");
          }
          res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
          res.status(401).json({ error: "يرجى تسجيل الدخول" });
        });
        return;
      }

      if (row.isBanned) {
        destroySessionRespondBanned(req, res);
        return;
      }

      if (isUserSecurityRevisionStale(req.session.userSecurityRevision, row.securityRevision)) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            logger.warn({ err: destroyErr, userId }, "session.destroy failed for stale security revision");
          }
          res.clearCookie(SESSION_COOKIE_NAME, { ...getSessionClearCookieOptions() });
          res.status(401).json({
            error: "انتهت صلاحية الجلسة لأسباب أمنية — سجّل الدخول مجدداً",
            code: "SESSION_SECURITY_STALE",
          });
        });
        return;
      }

      next();
    } catch (e) {
      next(e);
    }
  })();
}

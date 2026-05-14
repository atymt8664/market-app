import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const USER_CSRF_HEADER = "x-csrf-token";

export function ensureUserCsrfToken(req: Request): string {
  const existing = req.session?.userCsrfToken;
  if (typeof existing === "string" && existing.trim().length >= 32) {
    return existing;
  }
  const generated = crypto.randomBytes(32).toString("hex");
  req.session.userCsrfToken = generated;
  return generated;
}

/**
 * Requires a logged-in user and a valid CSRF token (header must match session).
 * Separate from admin CSRF (`adminCsrfToken` / `requireAdminCsrf`).
 */
export function requireUserCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "غير مسجل الدخول" });
    return;
  }
  const expected = req.session.userCsrfToken;
  const received = req.header(USER_CSRF_HEADER);
  if (
    typeof expected !== "string" ||
    typeof received !== "string" ||
    received.length !== expected.length
  ) {
    res.status(403).json({ error: "تم رفض الطلب" });
    return;
  }
  const matches = crypto.timingSafeEqual(
    Buffer.from(received, "utf8"),
    Buffer.from(expected, "utf8"),
  );
  if (!matches) {
    res.status(403).json({ error: "تم رفض الطلب" });
    return;
  }
  next();
}
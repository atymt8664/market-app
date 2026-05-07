import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const ADMIN_SESSION_TTL_MS = Number(process.env["ADMIN_SESSION_TTL_MS"] ?? 1000 * 60 * 60 * 8);
const ADMIN_CSRF_HEADER = "x-csrf-token";

export function hasValidAdminSession(req: Request): boolean {
  if (!req.session?.isAdmin) return false;
  const authenticatedAt = req.session.adminAuthenticatedAt;
  if (typeof authenticatedAt !== "number" || Number.isNaN(authenticatedAt)) return false;
  return Date.now() - authenticatedAt <= ADMIN_SESSION_TTL_MS;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!hasValidAdminSession(req)) {
    req.session.isAdmin = undefined;
    req.session.adminAuthenticatedAt = undefined;
    req.session.adminCsrfToken = undefined;
    req.session.adminActorId = undefined;
    req.session.adminActorLabel = undefined;
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

export function ensureAdminCsrfToken(req: Request): string {
  const existing = req.session?.adminCsrfToken;
  if (typeof existing === "string" && existing.trim().length >= 32) {
    return existing;
  }
  const generated = crypto.randomBytes(32).toString("hex");
  req.session.adminCsrfToken = generated;
  return generated;
}

export function attachAdminCsrfToken(req: Request, res: Response): string {
  const token = ensureAdminCsrfToken(req);
  res.setHeader("X-CSRF-Token", token);
  return token;
}

export function requireAdminCsrf(req: Request, res: Response, next: NextFunction) {
  if (!hasValidAdminSession(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const expected = req.session?.adminCsrfToken;
  const received = req.header(ADMIN_CSRF_HEADER);
  if (
    typeof expected !== "string" ||
    typeof received !== "string" ||
    received.length !== expected.length
  ) {
    return res
      .status(403)
      .json({ error: "CSRF token missing or invalid", code: "ADMIN_CSRF_INVALID" });
  }
  const matches = crypto.timingSafeEqual(
    Buffer.from(received, "utf8"),
    Buffer.from(expected, "utf8"),
  );
  if (!matches) {
    return res
      .status(403)
      .json({ error: "CSRF token missing or invalid", code: "ADMIN_CSRF_INVALID" });
  }
  return next();
}

import type { NextFunction, Request, Response } from "express";

const ADMIN_SESSION_TTL_MS = Number(process.env["ADMIN_SESSION_TTL_MS"] ?? 1000 * 60 * 60 * 8);

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
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

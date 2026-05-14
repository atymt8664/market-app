import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { isAdminAccessKeyConfigured } from "../lib/admin-access-key";
import { isAdminSecurityRevisionStale } from "../lib/admin-security-revision";

const ADMIN_SESSION_TTL_MS = Number(process.env["ADMIN_SESSION_TTL_MS"] ?? 1000 * 60 * 60 * 8);
const ADMIN_CSRF_HEADER = "x-csrf-token";

export function getAdminSessionTtlMs(): number {
  return ADMIN_SESSION_TTL_MS;
}

/** Clears admin login identity from session (used when auth fails or access grant is invalid). */
export function clearAdminIdentityOnSession(req: Request): void {
  if (!req.session) return;
  req.session.isAdmin = undefined;
  req.session.adminAuthenticatedAt = undefined;
  req.session.adminCsrfToken = undefined;
  req.session.adminActorId = undefined;
  req.session.adminActorLabel = undefined;
  req.session.adminAccessGrantedAt = undefined;
  req.session.adminTotpPending = undefined;
  req.session.adminTotpPendingExpiresAt = undefined;
  req.session.adminSecurityRevision = undefined;
  req.session.admin2faSetupSecret = undefined;
  req.session.admin2faSetupExpiresAt = undefined;
  req.session.adminTotpFailedAttempts = undefined;
}

export function hasValidAdminSession(req: Request): boolean {
  if (!req.session?.isAdmin) return false;
  const authenticatedAt = req.session.adminAuthenticatedAt;
  if (typeof authenticatedAt !== "number" || Number.isNaN(authenticatedAt)) return false;
  return Date.now() - authenticatedAt <= ADMIN_SESSION_TTL_MS;
}

/** When ADMIN_ACCESS_KEY is set, admin routes require a prior successful login that proved the key (session stamp). */
export function hasValidAdminAccessGrant(req: Request): boolean {
  if (!isAdminAccessKeyConfigured()) return true;
  const grantedAt = req.session?.adminAccessGrantedAt;
  if (typeof grantedAt !== "number" || Number.isNaN(grantedAt)) return false;
  return Date.now() - grantedAt <= ADMIN_SESSION_TTL_MS;
}

export function refreshAdminAccessGrant(req: Request): void {
  if (!req.session) return;
  req.session.adminAccessGrantedAt = Date.now();
}

export function requireAdminAccessGrant(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAccessKeyConfigured()) return next();
  if (hasValidAdminAccessGrant(req)) return next();
  return res.status(403).json({ error: "Forbidden" });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session?.isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!hasValidAdminSession(req)) {
      clearAdminIdentityOnSession(req);
      return res.status(401).json({ error: "Unauthorized" });
    }
    const rows = await db
      .select({ rev: appSettingsTable.adminSecurityRevision })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.id, 1))
      .limit(1);
    const dbRev = Number(rows[0]?.rev ?? 0);
    if (isAdminSecurityRevisionStale(req.session.adminSecurityRevision, dbRev)) {
      clearAdminIdentityOnSession(req);
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  } catch (err) {
    return next(err);
  }
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

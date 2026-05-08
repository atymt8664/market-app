import crypto from "crypto";
import type { Request } from "express";

/** Shared header for ADMIN_ACCESS_KEY proof (browser sends via fetch headers — never in query string). */
export const ADMIN_ACCESS_KEY_HEADER = "x-admin-access-key";

export function getConfiguredAdminAccessKey(): string {
  return String(process.env["ADMIN_ACCESS_KEY"] ?? "").trim();
}

export function isAdminAccessKeyConfigured(): boolean {
  return getConfiguredAdminAccessKey().length > 0;
}

/** Timing-safe compare via SHA-256 digests (constant-length compare). */
export function timingSafeCompareAdminAccessKey(provided: string | undefined): boolean {
  const expected = getConfiguredAdminAccessKey();
  if (!expected) return true;
  if (typeof provided !== "string") return false;
  const digestA = crypto.createHash("sha256").update(expected, "utf8").digest();
  const digestB = crypto.createHash("sha256").update(provided, "utf8").digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function readAdminAccessKeyHeader(req: Request): string | undefined {
  const raw = req.header(ADMIN_ACCESS_KEY_HEADER);
  return typeof raw === "string" ? raw : undefined;
}

/** Returns true when access-key enforcement is off, or the header matches env (timing-safe). */
export function verifyAdminAccessKeyHeader(req: Request): boolean {
  if (!isAdminAccessKeyConfigured()) return true;
  return timingSafeCompareAdminAccessKey(readAdminAccessKeyHeader(req));
}

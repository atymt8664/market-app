import type { NextFunction, Request, Response } from "express";
import { isClientIpAllowedForAdmin } from "../lib/admin-ip-allowlist";

/** Blocks admin surfaces when production IP allowlist is configured and client IP is not listed. */
export function requireAdminIpAllowlist(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isClientIpAllowedForAdmin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

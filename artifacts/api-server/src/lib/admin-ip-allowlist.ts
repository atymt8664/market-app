import net from "node:net";
import type { Request } from "express";
import {
  getTrustedClientIp,
  isLoopbackIp,
  normalizeClientIp,
} from "./client-ip";

const isProduction = process.env.NODE_ENV === "production";

function parseRawAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS?.trim();
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const s = part.trim();
    if (!s) continue;
    const norm = normalizeClientIp(s);
    if (net.isIP(norm) === 0) continue;
    out.push(norm);
  }
  return out;
}

/** Active only in production with at least one valid entry (comma-separated). */
export function isAdminIpAllowlistActive(): boolean {
  return isProduction && parseRawAllowlist().length > 0;
}

export function isClientIpAllowedForAdmin(req: Request): boolean {
  if (!isAdminIpAllowlistActive()) return true;
  const ip = getTrustedClientIp(req);
  const norm = normalizeClientIp(ip);
  if (isLoopbackIp(norm)) return true;
  const allowed = parseRawAllowlist();
  return allowed.some((a) => a === norm);
}

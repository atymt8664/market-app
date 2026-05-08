import net from "node:net";
import type { Request } from "express";

const isProduction = process.env.NODE_ENV === "production";
/** When set to "1", trust leftmost client IP from X-Forwarded-For in production (only behind a trusted proxy). */
const trustForwardedChain =
  process.env.TRUST_PROXY_IP_HEADERS?.trim() === "1";
/** When set to "1", trust CF-Connecting-IP in production (only when API is behind Cloudflare or equivalent that strips/forges safely). */
const trustCloudflareHeaders =
  process.env.TRUST_CLOUDFLARE_HEADERS?.trim() === "1";

function stripIpv4MappedIpv6(ip: string): string {
  const lower = ip.trim().toLowerCase();
  if (lower.startsWith("::ffff:")) {
    return lower.slice("::ffff:".length);
  }
  return ip.trim();
}

/** Normalize for comparisons (IPv4-mapped IPv6 → IPv4 string). */
export function normalizeClientIp(ip: string): string {
  const s = stripIpv4MappedIpv6(ip);
  return s;
}

export function isLoopbackIp(ip: string): boolean {
  const n = normalizeClientIp(ip);
  return n === "127.0.0.1" || n === "::1";
}

function pickSocketAddress(req: Request): string {
  const raw =
    req.socket?.remoteAddress ||
    // compatibility with older typings / proxies
    (req as unknown as { connection?: { remoteAddress?: string } }).connection
      ?.remoteAddress ||
    "";
  return raw ? normalizeClientIp(raw) : "";
}

/** Leftmost valid IP (typical client-first XFF ordering). Only used when TRUST_PROXY_IP_HEADERS=1. */
function firstIpFromForwarded(value: string): string | null {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const ip = part.replace(/^\[|\]$/g, "").split("%")[0] ?? part;
    if (!ip || net.isIP(ip) === 0) continue;
    return normalizeClientIp(ip);
  }
  return null;
}

function readCfConnectingIp(req: Request): string | null {
  const raw = req.headers["cf-connecting-ip"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string" || !v.trim()) return null;
  const first = v.split(",")[0]?.trim();
  if (!first || net.isIP(first) === 0) return null;
  return normalizeClientIp(first);
}

function readXForwardedFor(req: Request): string | null {
  const raw = req.headers["x-forwarded-for"];
  const v = Array.isArray(raw) ? raw.join(",") : raw;
  if (typeof v !== "string" || !v.trim()) return null;
  return firstIpFromForwarded(v);
}

/**
 * Client IP for admin security controls.
 *
 * - **Development**: never trusts CF/XFF (spoofable); uses Express `req.ip` / socket (localhost-safe).
 * - **Production**: uses `CF-Connecting-IP` only when `TRUST_CLOUDFLARE_HEADERS=1`; uses leftmost
 *   `X-Forwarded-For` only when `TRUST_PROXY_IP_HEADERS=1`; otherwise `req.ip` / socket only.
 */
export function getTrustedClientIp(req: Request): string {
  if (!isProduction) {
    const rip = typeof req.ip === "string" ? req.ip : "";
    if (rip && net.isIP(normalizeClientIp(rip)) !== 0) {
      return normalizeClientIp(rip);
    }
    const sock = pickSocketAddress(req);
    if (sock && net.isIP(sock) !== 0) return sock;
    return "127.0.0.1";
  }

  if (trustCloudflareHeaders) {
    const cf = readCfConnectingIp(req);
    if (cf) return cf;
  }

  if (trustForwardedChain) {
    const xff = readXForwardedFor(req);
    if (xff) return xff;
  }

  const rip = typeof req.ip === "string" ? req.ip : "";
  if (rip && net.isIP(normalizeClientIp(rip)) !== 0) {
    return normalizeClientIp(rip);
  }

  const sock = pickSocketAddress(req);
  if (sock && net.isIP(sock) !== 0) return sock;

  return "0.0.0.0";
}

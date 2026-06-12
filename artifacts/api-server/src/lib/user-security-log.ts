import type { Request } from "express";
import { desc, eq, lt, and, inArray } from "drizzle-orm";
import { db, userSecurityEventsTable } from "@workspace/db";
import { getTrustedClientIp } from "./client-ip";
import { ensureUserSecurityEventsTable } from "./ensure-user-security-events-table";

export type UserSecurityEventType =
  | "login"
  | "login.2fa"
  | "login.2fa_backup"
  | "2fa.enable"
  | "2fa.disable"
  | "2fa.backup_regenerate"
  | "password.change"
  | "session.revoke"
  | "session.revoke_others"
  | "device.revoke"
  | "logout";

/** Events surfaced as user-facing security alerts (excludes routine logout). */
export const SECURITY_ALERT_EVENT_TYPES: readonly UserSecurityEventType[] = [
  "login",
  "login.2fa",
  "login.2fa_backup",
  "2fa.enable",
  "2fa.disable",
  "2fa.backup_regenerate",
  "password.change",
  "session.revoke",
  "session.revoke_others",
  "device.revoke",
] as const;

export type SecurityAlertSeverity = "info" | "warning" | "critical";

export function securityAlertSeverity(eventType: string): SecurityAlertSeverity {
  switch (eventType) {
    case "login.2fa_backup":
    case "2fa.disable":
    case "password.change":
      return "critical";
    case "2fa.enable":
    case "2fa.backup_regenerate":
    case "session.revoke":
    case "session.revoke_others":
    case "device.revoke":
      return "warning";
    default:
      return "info";
  }
}

/** Compact device/browser hint from User-Agent (no PII). */
export function summarizeUserAgentHint(userAgent: string | null): string | null {
  if (!userAgent || !userAgent.trim()) return null;
  const ua = userAgent.toLowerCase();
  const isMobile = /iphone|ipad|android|mobile/.test(ua);
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  const platform = isMobile ? "Mobile" : "Desktop";
  return `${browser} · ${platform}`;
}

export type UserSecurityEventDto = {
  id: number;
  eventType: string;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type UserSecurityAlertDto = UserSecurityEventDto & {
  severity: SecurityAlertSeverity;
  deviceHint: string | null;
};

function readUserAgent(req: Request): string | null {
  const raw = req.headers["user-agent"];
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.slice(0, 512);
}

export async function logUserSecurityEvent(
  userId: number,
  eventType: UserSecurityEventType,
  req: Request,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await ensureUserSecurityEventsTable();
    await db.insert(userSecurityEventsTable).values({
      userId,
      eventType,
      ip: getTrustedClientIp(req),
      userAgent: readUserAgent(req),
      details,
    });
  } catch {
    /* non-blocking — security log must not break auth flows */
  }
}

export async function listUserSecurityEvents(
  userId: number,
  opts: { limit?: number; beforeId?: number } = {},
): Promise<UserSecurityEventDto[]> {
  await ensureUserSecurityEventsTable();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const conditions = [eq(userSecurityEventsTable.userId, userId)];
  if (typeof opts.beforeId === "number" && opts.beforeId > 0) {
    conditions.push(lt(userSecurityEventsTable.id, opts.beforeId));
  }

  const rows = await db
    .select()
    .from(userSecurityEventsTable)
    .where(and(...conditions))
    .orderBy(desc(userSecurityEventsTable.createdAt), desc(userSecurityEventsTable.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    ip: r.ip ?? null,
    userAgent: r.userAgent ?? null,
    details: (r.details && typeof r.details === "object" ? r.details : {}) as Record<
      string,
      unknown
    >,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listUserSecurityAlerts(
  userId: number,
  opts: { limit?: number; beforeId?: number } = {},
): Promise<UserSecurityAlertDto[]> {
  await ensureUserSecurityEventsTable();
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const conditions = [
    eq(userSecurityEventsTable.userId, userId),
    inArray(userSecurityEventsTable.eventType, [...SECURITY_ALERT_EVENT_TYPES]),
  ];
  if (typeof opts.beforeId === "number" && opts.beforeId > 0) {
    conditions.push(lt(userSecurityEventsTable.id, opts.beforeId));
  }

  const rows = await db
    .select()
    .from(userSecurityEventsTable)
    .where(and(...conditions))
    .orderBy(desc(userSecurityEventsTable.createdAt), desc(userSecurityEventsTable.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    ip: r.ip ?? null,
    userAgent: r.userAgent ?? null,
    details: (r.details && typeof r.details === "object" ? r.details : {}) as Record<
      string,
      unknown
    >,
    createdAt: r.createdAt.toISOString(),
    severity: securityAlertSeverity(r.eventType),
    deviceHint: summarizeUserAgentHint(r.userAgent ?? null),
  }));
}

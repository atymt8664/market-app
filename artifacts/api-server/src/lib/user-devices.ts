import { and, desc, eq, isNull } from "drizzle-orm";
import { db, pushSubscriptionsTable } from "@workspace/db";

export type UserDeviceView = {
  deviceId: number;
  deviceLabel: string | null;
  createdAt: string;
  isCurrent: boolean;
};

/** Best-effort label from stored user-agent — no external services. */
export function parseDeviceLabelFromUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent?.trim()) return null;
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes("android");
  const isIos = ua.includes("iphone") || ua.includes("ipad");
  const isWindows = ua.includes("windows");
  const isMac = ua.includes("mac os") || ua.includes("macintosh");
  const isChrome = ua.includes("chrome/") && !ua.includes("edg/");
  const isFirefox = ua.includes("firefox/");
  const isSafari = ua.includes("safari/") && !ua.includes("chrome/");

  const browser = isChrome
    ? "Chrome"
    : isFirefox
      ? "Firefox"
      : isSafari
        ? "Safari"
        : null;
  const os = isAndroid
    ? "Android"
    : isIos
      ? "iOS"
      : isWindows
        ? "Windows"
        : isMac
          ? "macOS"
          : null;

  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;
  return null;
}

function normalizeUserAgent(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, 512);
}

function isSameUserAgent(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeUserAgent(a);
  const right = normalizeUserAgent(b);
  if (!left || !right) return false;
  return left === right;
}

function toIsoDate(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (value == null) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

/** Active push-registered devices for the marketplace user (not admin). */
export async function listUserDevices(
  userId: number,
  currentUserAgent?: string | null,
): Promise<UserDeviceView[]> {
  if (!Number.isInteger(userId) || userId <= 0) return [];
  const rows = await db
    .select({
      id: pushSubscriptionsTable.id,
      userAgent: pushSubscriptionsTable.userAgent,
      createdAt: pushSubscriptionsTable.createdAt,
    })
    .from(pushSubscriptionsTable)
    .where(
      and(eq(pushSubscriptionsTable.userId, userId), isNull(pushSubscriptionsTable.revokedAt)),
    )
    .orderBy(desc(pushSubscriptionsTable.createdAt))
    .limit(50);

  return rows.map((row) => ({
    deviceId: row.id,
    deviceLabel: parseDeviceLabelFromUserAgent(row.userAgent),
    createdAt: toIsoDate(row.createdAt),
    isCurrent: isSameUserAgent(row.userAgent, currentUserAgent),
  }));
}

export type RevokeUserDeviceResult = "revoked" | "not_found";

export async function revokeUserDevice(
  userId: number,
  deviceId: number,
): Promise<RevokeUserDeviceResult> {
  if (!Number.isInteger(deviceId) || deviceId <= 0) return "not_found";
  const result = await db
    .update(pushSubscriptionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pushSubscriptionsTable.id, deviceId),
        eq(pushSubscriptionsTable.userId, userId),
        isNull(pushSubscriptionsTable.revokedAt),
      ),
    );
  return Number(result.rowCount ?? 0) > 0 ? "revoked" : "not_found";
}

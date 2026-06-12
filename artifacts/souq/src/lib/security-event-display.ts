import { t } from "@/i18n";

export type SecurityDeviceInfo = { browser: string; mobile: boolean };

/** Compact browser/platform from User-Agent (mirrors API hint; no IP). */
export function parseSecurityDeviceFromUserAgent(userAgent: string | null): SecurityDeviceInfo | null {
  if (!userAgent?.trim()) return null;
  const ua = userAgent.toLowerCase();
  const mobile = /iphone|ipad|android|mobile/.test(ua);
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  return { browser, mobile };
}

export function parseSecurityDeviceFromHint(deviceHint: string | null): SecurityDeviceInfo | null {
  if (!deviceHint?.trim()) return null;
  const [browserPart, platformPart] = deviceHint.split("·").map((s) => s.trim());
  if (!browserPart) return null;
  return { browser: browserPart, mobile: platformPart?.toLowerCase() === "mobile" };
}

/** Localized device line — never includes IP. */
export function formatSecurityDeviceLabel(source: {
  userAgent?: string | null;
  deviceHint?: string | null;
}): string | null {
  const info =
    parseSecurityDeviceFromUserAgent(source.userAgent ?? null) ??
    parseSecurityDeviceFromHint(source.deviceHint ?? null);
  if (!info) return null;
  const key = info.mobile
    ? "settings.security_event.device.mobile"
    : "settings.security_event.device.desktop";
  return t(key, { browser: info.browser });
}

import type { UserPresenceEntry } from "@workspace/api-client-react";
import { t } from "@/i18n";

export type AdDetailSellerPresenceState =
  | { kind: "online"; text: string }
  | { kind: "last_seen"; text: string };

/** Discrete elapsed bucket — no date-fns «تقريبًا». */
export function formatSellerPresenceElapsed(lastSeenAt: string): string | null {
  const then = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(then)) return null;

  const diffMs = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 60) {
    return minutes <= 1
      ? t("ad_detail.seller_presence.one_minute")
      : t("ad_detail.seller_presence.minutes", { count: String(minutes) });
  }
  if (hours < 24) {
    return hours === 1
      ? t("ad_detail.seller_presence.one_hour")
      : t("ad_detail.seller_presence.hours", { count: String(hours) });
  }
  return days === 1
    ? t("ad_detail.seller_presence.one_day")
    : t("ad_detail.seller_presence.days", { count: String(days) });
}

export function resolveAdDetailSellerPresenceText(
  entry: UserPresenceEntry | undefined,
  isLoading?: boolean,
): AdDetailSellerPresenceState | null {
  if (isLoading) return null;
  if (!entry || entry.visibility === "hidden") return null;

  if (entry.isOnline) {
    return { kind: "online", text: t("ad_detail.seller_presence.online") };
  }

  if (entry.lastSeenAt) {
    const elapsed = formatSellerPresenceElapsed(entry.lastSeenAt);
    if (!elapsed) return null;
    return {
      kind: "last_seen",
      text: t("ad_detail.seller_presence.last_seen", { elapsed }),
    };
  }

  /** Offline with no lastSeenAt — insufficient data; hide badge (never «غير متصل»). */
  return null;
}

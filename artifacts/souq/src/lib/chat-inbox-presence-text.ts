import type { UserPresenceEntry } from "@workspace/api-client-react";
import { formatRelativeTime } from "@/lib/format";
import { getLocale, t, type Locale } from "@/i18n";

const LAST_SEEN_PREFIX: Record<Locale, string> = {
  ar: "آخر ظهور ",
  en: "Last seen ",
  de: "Zuletzt online ",
};

const ONLINE_LABEL: Record<Locale, string> = {
  ar: "متصل الآن",
  en: "Active now",
  de: "Jetzt aktiv",
};

function resolveI18nOrFallback(key: string, fallback: string): string {
  const translated = t(key);
  if (translated !== key && translated.trim().length > 0) {
    return translated;
  }
  return fallback;
}

export function inboxLastSeenPrefix(): string {
  return resolveI18nOrFallback(
    "p5.chat.inbox.last_seen_prefix",
    LAST_SEEN_PREFIX[getLocale()] ?? LAST_SEEN_PREFIX.ar,
  );
}

export function inboxOnlineLabel(): string {
  return resolveI18nOrFallback(
    "p5.chat.inbox.online",
    ONLINE_LABEL[getLocale()] ?? ONLINE_LABEL.ar,
  );
}

/** Full inbox last-seen copy — always includes the prefix before relative time. */
export function formatInboxLastSeenText(lastSeenAt: string): string | null {
  const rel = formatRelativeTime(lastSeenAt);
  if (!rel) return null;

  const fromTemplate = t("p5.chat.inbox.last_seen", { time: rel });
  if (!fromTemplate.includes("{time}") && fromTemplate !== "p5.chat.inbox.last_seen") {
    return fromTemplate;
  }

  return `${inboxLastSeenPrefix()}${rel}`;
}

export function resolveInboxPresenceText(
  entry: UserPresenceEntry | undefined,
  isLoading?: boolean,
): { kind: "online" | "last_seen"; text: string } | null {
  if (isLoading) return null;
  if (!entry || entry.visibility === "hidden") return null;
  if (entry.isOnline) {
    return { kind: "online", text: inboxOnlineLabel() };
  }
  if (entry.lastSeenAt) {
    const text = formatInboxLastSeenText(entry.lastSeenAt);
    if (!text) return null;
    return { kind: "last_seen", text };
  }
  return null;
}

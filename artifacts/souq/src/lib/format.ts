import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  parseISO,
} from "date-fns";
import { ar, de, enUS } from "date-fns/locale";
import { getLocale, t } from "@/i18n";

function getDateFnsLocale() {
  const locale = getLocale();
  if (locale === "de") return de;
  if (locale === "en") return enUS;
  return ar;
}

export function formatRelativeTime(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: getDateFnsLocale(),
    });
  } catch (e) {
    return "";
  }
}

/** Notification Center — fast-scan time hierarchy (today → week → older). */
export function formatNotificationTime(dateString: string) {
  const loc = getDateFnsLocale();
  try {
    const d = parseISO(dateString);
    const time = format(d, "p", { locale: loc });
    if (isToday(d)) return time;
    if (isYesterday(d)) {
      const y = t("notifications.time.yesterday");
      return `${y} · ${time}`;
    }
    if (isThisWeek(d, { weekStartsOn: 1 })) {
      return `${format(d, "EEE", { locale: loc })} · ${time}`;
    }
    return `${format(d, "d MMM", { locale: loc })} · ${time}`;
  } catch {
    return "";
  }
}

/**
 * Security Alerts / Security Log — stable datetime (no RTL bidi breakage).
 * Example (ar): 12 يونيو 2026 • 5:23 م
 */
export function formatSecurityEventTime(
  dateString: string,
  locale: "ar" | "de" | "en",
): string {
  try {
    const d = parseISO(dateString);
    if (Number.isNaN(d.getTime())) return dateString;

    const intlLocale =
      locale === "ar" ? "ar-u-nu-latn" : locale === "de" ? "de-DE" : "en-GB";

    const datePart = new Intl.DateTimeFormat(intlLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

    const timePart = new Intl.DateTimeFormat(intlLocale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: locale !== "de",
    }).format(d);

    return `${datePart} • ${timePart}`;
  } catch {
    return dateString;
  }
}

/** Short timestamp for chat bubbles (locale-aware). */
export function formatMessageTimestamp(
  dateString: string,
  locale: "ar" | "de" | "en",
) {
  const loc = locale === "de" ? de : locale === "en" ? enUS : ar;
  try {
    const d = parseISO(dateString);
    const time = format(d, "p", { locale: loc });
    if (isToday(d)) return time;
    return `${format(d, "d MMM", { locale: loc })} · ${time}`;
  } catch {
    return "";
  }
}

const DEFAULT_CURRENCY = "EUR";

export function resolveCurrencyCode(currency?: string | null) {
  if (!currency) return DEFAULT_CURRENCY;
  const code = currency.trim().toUpperCase();
  if (!code) return DEFAULT_CURRENCY;
  return code;
}

export function currencyCodeToSymbol(currency?: string | null) {
  const code = resolveCurrencyCode(currency);
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export function formatCurrencyAmount(
  price: number,
  currency?: string | null,
  maximumFractionDigits = 0,
) {
  const locale = getLocale();
  const code = resolveCurrencyCode(currency);
  try {
    const numberLocale =
      locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar-DE";
    return new Intl.NumberFormat(numberLocale, {
      style: "currency",
      currency: code,
      maximumFractionDigits,
    }).format(price);
  } catch {
    const fallbackLocale =
      locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar";
    return `${price.toLocaleString(fallbackLocale)} ${currencyCodeToSymbol(code)}`;
  }
}

export function formatPrice(
  price: number | null | undefined,
  _type: string,
  currency?: string | null,
) {
  if (price == null) return t("ad-card.unknown_price");

  const formatted = formatCurrencyAmount(price, currency, 0);
  return formatted;
}

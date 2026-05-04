import {
  format,
  formatDistanceToNow,
  isToday,
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

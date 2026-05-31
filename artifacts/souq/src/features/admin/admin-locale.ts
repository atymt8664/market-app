import type { Locale } from "@/i18n";

const INTL_LOCALE: Record<Locale, string> = {
  ar: "ar-EG",
  en: "en-GB",
  de: "de-DE",
};

export function adminIntlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

export function adminTextDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function formatAdminNumber(value: number, locale: Locale): string {
  return value.toLocaleString(adminIntlLocale(locale));
}

export function formatAdminDateTime(
  iso: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(adminIntlLocale(locale), options);
}

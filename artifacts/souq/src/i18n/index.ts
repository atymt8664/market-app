import ar from "@/i18n/locales/ar.json";
import en from "@/i18n/locales/en.json";
import de from "@/i18n/locales/de.json";

type Locale = "ar" | "en" | "de";
type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en,
  de,
};

const activeLocale: Locale = "ar";

export function t(key: string, params?: Record<string, string | number>): string {
  const fallback = dictionaries.ar[key] ?? key;
  const template = dictionaries[activeLocale][key] ?? fallback;

  if (!params) return template;

  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

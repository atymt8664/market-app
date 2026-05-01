import ar from "@/i18n/locales/ar.json";
import en from "@/i18n/locales/en.json";
import de from "@/i18n/locales/de.json";

export type Locale = "ar" | "en" | "de";
type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en,
  de,
};

const STORAGE_KEY = "app_locale";
const listeners = new Set<() => void>();

function isLocale(value: string | null): value is Locale {
  return value === "ar" || value === "en" || value === "de";
}

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const saved = localStorage.getItem(STORAGE_KEY);
  return isLocale(saved) ? saved : "ar";
}

let activeLocale: Locale = resolveInitialLocale();

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

applyDocumentLocale(activeLocale);

export function getLocale(): Locale {
  return activeLocale;
}

export function setLocale(locale: Locale) {
  const changed = activeLocale !== locale;
  activeLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  applyDocumentLocale(locale);
  if (changed) listeners.forEach((listener) => listener());
}

export function hasSavedLocale(): boolean {
  if (typeof window === "undefined") return false;
  return isLocale(localStorage.getItem(STORAGE_KEY));
}

export function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const fallback = dictionaries.ar[key] ?? key;
  const raw = dictionaries[activeLocale][key];
  const template = raw && raw.trim().length > 0 ? raw : fallback;

  if (!params) return template;

  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

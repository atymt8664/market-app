import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import gateAr from "./locales/gate/ar.json";
import gateDe from "./locales/gate/de.json";
import gateEn from "./locales/gate/en.json";

export type Locale = "ar" | "en" | "de";
type Dictionary = Record<string, string>;

/** Defer full locale download until Gate first paint is done (6B-1 / 7A.6). */
const GATE_FULL_LOCALE_PREFETCH_IDLE_MS = 2500;

const STORAGE_KEY = "app_locale";
const listeners = new Set<() => void>();

/** Inlined gate copy — no async chunk on first-launch critical path (7A.6). */
const GATE_LOCALES: Record<Locale, Dictionary> = {
  ar: gateAr,
  en: gateEn,
  de: gateDe,
};

const localeLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  ar: () => import("./locales/ar.json"),
  en: () => import("./locales/en.json"),
  de: () => import("./locales/de.json"),
};

const dictionaries: Partial<Record<Locale, Dictionary>> = {};
const loadPromises: Partial<Record<Locale, Promise<Dictionary>>> = {};
const gateOnlyLocales = new Set<Locale>();

function isLocale(value: string | null): value is Locale {
  return value === "ar" || value === "en" || value === "de";
}

function readSavedLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return isLocale(saved) ? saved : null;
}

function resolveInitialLocale(): Locale {
  return readSavedLocale() ?? "ar";
}

let activeLocale: Locale = resolveInitialLocale();

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

applyDocumentLocale(activeLocale);

function applyGateLocale(locale: Locale): void {
  dictionaries[locale] = GATE_LOCALES[locale];
  gateOnlyLocales.add(locale);
}

/**
 * Synchronous gate strings for first launch — call before React render (7A.6).
 * Removes dynamic `gate/*.json` chunks from LCP critical path.
 */
export function seedFirstLaunchLocales(): void {
  activeLocale = resolveInitialLocale();
  applyDocumentLocale(activeLocale);
  applyGateLocale(activeLocale);
  if (activeLocale !== "ar") {
    applyGateLocale("ar");
  }
}

async function loadLocale(locale: Locale): Promise<Dictionary> {
  const cached = dictionaries[locale];
  if (cached && !gateOnlyLocales.has(locale)) return cached;

  const pending = loadPromises[locale];
  if (pending) return pending;

  const promise = localeLoaders[locale]().then((mod) => {
    dictionaries[locale] = mod.default;
    gateOnlyLocales.delete(locale);
    return mod.default;
  });

  loadPromises[locale] = promise;
  return promise;
}

function prefetchFullLocalesInBackground(): void {
  void loadLocale(activeLocale).then(() => {
    if (activeLocale !== "ar") void loadLocale("ar");
  });
}

/** Active locale + Arabic fallback (for missing keys) before first React render. */
export async function ensureLocalesForActive(): Promise<void> {
  activeLocale = resolveInitialLocale();
  applyDocumentLocale(activeLocale);

  if (typeof window !== "undefined" && !hasSavedLocale()) {
    seedFirstLaunchLocales();
    scheduleAfterFirstPaint(
      () => prefetchFullLocalesInBackground(),
      GATE_FULL_LOCALE_PREFETCH_IDLE_MS,
    );
    return;
  }

  const loads: Promise<Dictionary>[] = [loadLocale(activeLocale)];
  if (activeLocale !== "ar") {
    loads.push(loadLocale("ar"));
  }
  await Promise.all(loads);
}

export function getLocale(): Locale {
  return activeLocale;
}

export async function setLocale(locale: Locale): Promise<void> {
  const changed = activeLocale !== locale;
  activeLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  applyDocumentLocale(locale);
  await loadLocale(locale);
  if (locale !== "ar") {
    await loadLocale("ar");
  }
  if (changed) listeners.forEach((listener) => listener());
}

export function hasSavedLocale(): boolean {
  return readSavedLocale() !== null;
}

export function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const arDict = dictionaries.ar;
  const fallback = arDict?.[key] ?? key;
  const activeDict = dictionaries[activeLocale];
  const raw = activeDict?.[key];
  const template = raw && raw.trim().length > 0 ? raw : fallback;

  if (!params) return template;

  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

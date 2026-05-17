export type Locale = "ar" | "en" | "de";
type Dictionary = Record<string, string>;

const STORAGE_KEY = "app_locale";
const listeners = new Set<() => void>();

const localeLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  ar: () => import("./locales/ar.json"),
  en: () => import("./locales/en.json"),
  de: () => import("./locales/de.json"),
};

/** First-launch gate only — 8 keys, ~1 KB gzip vs full locale chunks. */
const gateLocaleLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  ar: () => import("./locales/gate/ar.json"),
  en: () => import("./locales/gate/en.json"),
  de: () => import("./locales/gate/de.json"),
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

function clearGateOnlyLocale(locale: Locale): void {
  if (!gateOnlyLocales.has(locale)) return;
  gateOnlyLocales.delete(locale);
  delete dictionaries[locale];
  delete loadPromises[locale];
}

async function loadLocale(locale: Locale): Promise<Dictionary> {
  clearGateOnlyLocale(locale);

  const cached = dictionaries[locale];
  if (cached) return cached;

  const pending = loadPromises[locale];
  if (pending) return pending;

  const promise = localeLoaders[locale]().then((mod) => {
    dictionaries[locale] = mod.default;
    return mod.default;
  });

  loadPromises[locale] = promise;
  return promise;
}

async function loadGateLocale(locale: Locale): Promise<Dictionary> {
  const cached = dictionaries[locale];
  if (cached && !gateOnlyLocales.has(locale)) return cached;

  const mod = await gateLocaleLoaders[locale]();
  dictionaries[locale] = mod.default;
  gateOnlyLocales.add(locale);
  return mod.default;
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
    await loadGateLocale(activeLocale);
    if (activeLocale !== "ar") {
      await loadGateLocale("ar");
    }
    prefetchFullLocalesInBackground();
    return;
  }

  await loadLocale(activeLocale);
  if (activeLocale !== "ar") {
    await loadLocale("ar");
  }
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

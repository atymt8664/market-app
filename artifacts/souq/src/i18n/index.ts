import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import gateAr from "./locales/gate/ar.json";
import gateDe from "./locales/gate/de.json";
import gateEn from "./locales/gate/en.json";

export type Locale = "ar" | "en" | "de";
type Dictionary = Record<string, string>;

/** P7-PR-9: full locale only after long idle — never on Home LCP window (~0–3s). */
const FULL_LOCALE_IDLE_MS = 12_000;

const STORAGE_KEY = "app_locale";
const listeners = new Set<() => void>();

/** Inlined gate copy — no async chunk on first-launch critical path (7A.6). */
const GATE_LOCALES: Record<Locale, Dictionary> = {
  ar: gateAr,
  en: gateEn,
  de: gateDe,
};

async function mergeLocale(
  baseMod: Promise<{ default: Dictionary }>,
  legalMod: Promise<{ default: Dictionary }>,
): Promise<{ default: Dictionary }> {
  const [base, legal] = await Promise.all([baseMod, legalMod]);
  return { default: { ...base.default, ...legal.default } };
}

const localeLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  ar: () => mergeLocale(import("./locales/ar.json"), import("./locales/legal-ar.json")),
  en: () => mergeLocale(import("./locales/en.json"), import("./locales/legal-en.json")),
  de: () => mergeLocale(import("./locales/de.json"), import("./locales/legal-de.json")),
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

let fullLocaleLoadStarted = false;
let fullLocaleInteractionHooked = false;

function isHomeRoute(): boolean {
  if (typeof window === "undefined") return false;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const p = window.location.pathname;
  const stripped = base && p.startsWith(base) ? p.slice(base.length) || "/" : p;
  return stripped === "/" || stripped === "";
}

type PrefetchFullLocalesOptions = {
  /** Full ar.json fallback — skip on Home cold path (gate covers Home). */
  loadAr?: boolean;
};

/** P7-PR-9: full dictionaries — not on Home LCP window; gate covers Home + BottomNav. */
async function prefetchFullLocales(options: PrefetchFullLocalesOptions = {}): Promise<void> {
  const loadAr = options.loadAr ?? !isHomeRoute();
  const tasks: Promise<Dictionary>[] = [];

  if (activeLocale !== "ar" || loadAr) {
    tasks.push(loadLocale(activeLocale));
  }
  if (loadAr && activeLocale !== "ar") {
    tasks.push(loadLocale("ar"));
  }

  if (tasks.length === 0) return;

  if (fullLocaleLoadStarted) {
    await Promise.all(tasks);
    listeners.forEach((listener) => listener());
    return;
  }
  fullLocaleLoadStarted = true;

  await Promise.all(tasks);
  listeners.forEach((listener) => listener());
}

function scheduleFullLocaleOnLongIdle(): void {
  scheduleAfterFirstPaint(() => {
    const run = () => {
      if (isHomeRoute()) return;
      void prefetchFullLocales({ loadAr: true });
    };
    const ric = window.requestIdleCallback;
    if (ric) {
      ric(run, { timeout: FULL_LOCALE_IDLE_MS });
      return;
    }
    window.setTimeout(run, FULL_LOCALE_IDLE_MS);
  }, FULL_LOCALE_IDLE_MS);
}

/** Route change / deep UI — load full dict (incl. ar fallback when needed). */
export function ensureFullLocaleForInteraction(): void {
  void prefetchFullLocales({ loadAr: true });
}

function hookFullLocaleOnFirstInteraction(): void {
  if (fullLocaleInteractionHooked || typeof window === "undefined") return;
  fullLocaleInteractionHooked = true;

  const run = () => {
    window.removeEventListener("pointerdown", run, true);
    window.removeEventListener("keydown", run, true);
    void prefetchFullLocales({ loadAr: !isHomeRoute() });
  };
  window.addEventListener("pointerdown", run, { capture: true, once: true });
  window.addEventListener("keydown", run, { capture: true, once: true });
}

/**
 * P7-PR-6: gate-only sync bootstrap — mount React immediately; full ar.json after first paint.
 * P7-PR-3 regression: gate keys cover Home cold path (see sync-home-gate-locales.mjs).
 */
export function ensureBootstrapLocales(): void {
  if (!hasSavedLocale()) {
    seedFirstLaunchLocales();
  } else {
    bootstrapReturningUserLocale();
  }
  scheduleFullLocaleOnLongIdle();
  hookFullLocaleOnFirstInteraction();
}

/** Active locale + Arabic fallback (for missing keys) before first React render. */
export async function ensureLocalesForActive(): Promise<void> {
  activeLocale = resolveInitialLocale();
  applyDocumentLocale(activeLocale);

  if (typeof window !== "undefined" && !hasSavedLocale()) {
    seedFirstLaunchLocales();
    scheduleFullLocaleOnLongIdle();
    hookFullLocaleOnFirstInteraction();
    return;
  }

  bootstrapReturningUserLocale();
  scheduleFullLocaleOnLongIdle();
  hookFullLocaleOnFirstInteraction();
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

/** Gate-only sync bootstrap for returning users — full dict loaded after first paint (P7-PR-6). */
export function bootstrapReturningUserLocale(): void {
  activeLocale = resolveInitialLocale();
  applyDocumentLocale(activeLocale);
  applyGateLocale(activeLocale);
  if (activeLocale !== "ar") {
    applyGateLocale("ar");
  }
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

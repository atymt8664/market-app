/**
 * P11-5 — Open Graph + Twitter Card foundation (runtime, route-aware).
 * Complements P11-4 SEO without modifying seo-foundation.ts.
 */
import type { Locale } from "@/i18n";
import {
  buildCanonicalUrl,
  SEO_CANONICAL_ORIGIN,
  truncateForMeta,
  type PageSeoConfig,
} from "@/lib/seo-foundation";
import { P11_BRAND_OFFICIAL_NAME } from "@/lib/structured-data-foundation";

export const P11_OG_HOME_IMAGE_URL = `${SEO_CANONICAL_ORIGIN}/brand/og-share-home.jpg`;
export const P11_OG_DEFAULT_IMAGE = P11_OG_HOME_IMAGE_URL;
export const P11_OG_IMAGE_ALT = `${P11_BRAND_OFFICIAL_NAME} — سوق العرب EU`;
export const P11_OG_IMAGE_WIDTH = 1200;
export const P11_OG_IMAGE_HEIGHT = 630;

const OG_LOCALE: Record<Locale, string> = {
  ar: "ar_AR",
  en: "en_US",
  de: "de_DE",
};

const ALL_LOCALES: Locale[] = ["ar", "en", "de"];

export type PageSocialMetaConfig = {
  title: string;
  description: string;
  url: string;
  locale: Locale;
  type?: "website" | "article";
  imageUrl?: string;
  imageAlt?: string;
};

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/public\/(.+)$/;

/** OG image (1200×630) — Supabase transform or passthrough https URL. */
export function toOgImageUrl(originalUrl: string | null | undefined): string {
  if (!originalUrl?.trim()) return P11_OG_DEFAULT_IMAGE;
  const trimmed = originalUrl.trim();
  if (!/^https:\/\//i.test(trimmed)) return P11_OG_DEFAULT_IMAGE;
  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (match) {
    const params = "width=1200&height=630&resize=cover&quality=82";
    return `${match[1]}/render/image/public/${match[2]}?${params}`;
  }
  return trimmed;
}

/** OG avatar (1200×630 contain — full face visible). */
export function toOgAvatarUrl(originalUrl: string | null | undefined): string {
  if (!originalUrl?.trim()) return P11_OG_DEFAULT_IMAGE;
  const trimmed = originalUrl.trim();
  if (!/^https:\/\//i.test(trimmed)) return P11_OG_DEFAULT_IMAGE;
  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (match) {
    const params = "width=1200&height=630&resize=contain&quality=82";
    return `${match[1]}/render/image/public/${match[2]}?${params}`;
  }
  return trimmed;
}

export function isPublicShareImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return /^https:\/\//i.test(url.trim()) && !/^data:/i.test(url);
}

type AdShareInput = {
  id: number;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  priceType?: string | null;
  city?: string | null;
  images?: string[] | null;
};

export function buildAdSocialOverride(ad: AdShareInput): Partial<PageSocialMetaConfig> {
  const parts: string[] = [];
  const desc = ad.description?.trim();
  if (desc) parts.push(truncateForMeta(desc, 160));
  if (ad.price != null && ad.priceType !== "free") {
    const n = Number(ad.price);
    if (Number.isFinite(n)) parts.push(`${n} EUR`);
  } else if (ad.priceType === "free") {
    parts.push("مجاني");
  }
  if (ad.city?.trim()) parts.push(ad.city.trim());
  const firstImage = ad.images?.[0];
  return {
    type: "article",
    imageUrl: isPublicShareImageUrl(firstImage)
      ? toOgImageUrl(firstImage)
      : P11_OG_DEFAULT_IMAGE,
    imageAlt: ad.title?.trim() || P11_OG_IMAGE_ALT,
    description:
      parts.length > 0 ? truncateForMeta(parts.join(" · "), 200) : undefined,
  };
}

type ProfileShareInput = {
  id: number;
  name?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
};

export function buildProfileSocialOverride(
  profile: ProfileShareInput,
): Partial<PageSocialMetaConfig> {
  const name = profile.name?.trim() || "";
  const title = name ? `${name} | ${P11_BRAND_OFFICIAL_NAME}` : undefined;
  const parts: string[] = [];
  const city = profile.city?.trim();
  if (city) parts.push(city);
  parts.push("تصفّح إعلانات هذا العضو");
  return {
    title,
    description: truncateForMeta(parts.join(" · "), 200),
    imageUrl: isPublicShareImageUrl(profile.avatarUrl)
      ? toOgAvatarUrl(profile.avatarUrl)
      : P11_OG_DEFAULT_IMAGE,
    imageAlt: name || P11_OG_IMAGE_ALT,
    type: "website",
  };
}

type MetaEntry = {
  el: HTMLMetaElement;
  created: boolean;
  previousContent: string | null;
};

function upsertPropertyMeta(property: string, content: string): MetaEntry {
  const selector = `meta[property="${property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  let created = false;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
    created = true;
  }
  const previousContent = el.getAttribute("content");
  el.setAttribute("content", content);
  return { el, created, previousContent };
}

function upsertNameMeta(name: string, content: string): MetaEntry {
  const selector = `meta[name="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  let created = false;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
    created = true;
  }
  const previousContent = el.getAttribute("content");
  el.setAttribute("content", content);
  return { el, created, previousContent };
}

function restoreMeta(entry: MetaEntry): void {
  if (entry.created) {
    entry.el.remove();
    return;
  }
  if (entry.previousContent !== null) {
    entry.el.setAttribute("content", entry.previousContent);
  }
}

function clearAlternateLocales(): void {
  document.head
    .querySelectorAll('meta[property="og:locale:alternate"]')
    .forEach((el) => el.remove());
}

export function buildSocialMetaFromPageSeo(
  seo: PageSeoConfig,
  locale: Locale,
): PageSocialMetaConfig {
  const isAd = /^\/ad\/\d+$/.test(seo.canonicalPath);
  return {
    title: seo.title,
    description: seo.description,
    url: buildCanonicalUrl(seo.canonicalPath),
    locale,
    type: isAd ? "article" : "website",
    imageUrl: P11_OG_DEFAULT_IMAGE,
  };
}

/** Apply Open Graph + Twitter tags; returns restore function. */
export function applyPageSocialMeta(config: PageSocialMetaConfig): () => void {
  if (typeof document === "undefined") return () => {};

  const imageUrl = config.imageUrl ?? P11_OG_DEFAULT_IMAGE;
  const imageAlt = config.imageAlt ?? P11_OG_IMAGE_ALT;
  const ogType = config.type ?? "website";
  const ogLocale = OG_LOCALE[config.locale];

  const entries: MetaEntry[] = [
    upsertPropertyMeta("og:title", config.title),
    upsertPropertyMeta("og:description", config.description),
    upsertPropertyMeta("og:url", config.url),
    upsertPropertyMeta("og:type", ogType),
    upsertPropertyMeta("og:site_name", P11_BRAND_OFFICIAL_NAME),
    upsertPropertyMeta("og:locale", ogLocale),
    upsertPropertyMeta("og:image", imageUrl),
    upsertPropertyMeta("og:image:secure_url", imageUrl),
    upsertPropertyMeta("og:image:width", String(P11_OG_IMAGE_WIDTH)),
    upsertPropertyMeta("og:image:height", String(P11_OG_IMAGE_HEIGHT)),
    upsertPropertyMeta("og:image:type", "image/jpeg"),
    upsertPropertyMeta("og:image:alt", imageAlt),
    upsertNameMeta("twitter:card", "summary_large_image"),
    upsertNameMeta("twitter:title", config.title),
    upsertNameMeta("twitter:description", config.description),
    upsertNameMeta("twitter:image", imageUrl),
    upsertNameMeta("twitter:image:alt", imageAlt),
  ];

  const previousAlternates = Array.from(
    document.head.querySelectorAll<HTMLMetaElement>('meta[property="og:locale:alternate"]'),
  ).map((el) => ({
    el,
    content: el.getAttribute("content"),
  }));
  clearAlternateLocales();
  for (const loc of ALL_LOCALES) {
    if (loc === config.locale) continue;
    const alt = document.createElement("meta");
    alt.setAttribute("property", "og:locale:alternate");
    alt.setAttribute("content", OG_LOCALE[loc]);
    document.head.appendChild(alt);
  }

  return () => {
    for (const entry of entries) restoreMeta(entry);
    clearAlternateLocales();
    for (const prev of previousAlternates) {
      if (prev.content) {
        const alt = document.createElement("meta");
        alt.setAttribute("property", "og:locale:alternate");
        alt.setAttribute("content", prev.content);
        document.head.appendChild(alt);
      }
    }
  };
}

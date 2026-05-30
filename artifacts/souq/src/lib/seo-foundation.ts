/**
 * P11-4 — SEO Foundation (title, description, canonical, robots only).
 * Does not modify Open Graph or structured data.
 */
import { t, type Locale } from "@/i18n";

export const SEO_CANONICAL_ORIGIN = "https://www.souq-arab.com";

export type PageSeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: "index,follow" | "noindex,follow" | "noindex,nofollow";
};

type MetaSnapshot = {
  title: string;
  description: string | null;
  canonicalHref: string | null;
  robots: string | null;
  canonicalCreated: boolean;
};

function readMeta(selector: string): HTMLMetaElement | HTMLLinkElement | null {
  return document.head.querySelector(selector);
}

function upsertMeta(
  selector: string,
  attr: "name" | "property",
  value: string,
  content: string,
): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertCanonical(href: string): { el: HTMLLinkElement; created: boolean } {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  let created = false;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
    created = true;
  }
  el.setAttribute("href", href);
  return { el, created };
}

export function buildCanonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/" || normalized === "") {
    return `${SEO_CANONICAL_ORIGIN}/`;
  }
  return `${SEO_CANONICAL_ORIGIN}${normalized}`;
}

/** Official platform description — locale-aware (Arabic is source of truth). */
export function getDefaultSiteDescription(locale: Locale): string {
  if (locale === "en") return t("p11.seo.default_description_en");
  if (locale === "de") return t("p11.seo.default_description_de");
  return t("p11.seo.default_description");
}

export function getDefaultSiteTitle(locale: Locale): string {
  return t("p11.seo.home_title");
}

/** Trim visible text for meta description (search snippet length). */
export function truncateForMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function snapshotCurrentSeo(): MetaSnapshot {
  const description = readMeta('meta[name="description"]');
  const canonical = readMeta('link[rel="canonical"]');
  const robots = readMeta('meta[name="robots"]');
  return {
    title: document.title,
    description: description?.getAttribute("content") ?? null,
    canonicalHref: canonical?.getAttribute("href") ?? null,
    robots: robots?.getAttribute("content") ?? null,
    canonicalCreated: false,
  };
}

/** Apply SEO meta; returns restore function. */
export function applyPageSeo(config: PageSeoConfig): () => void {
  if (typeof document === "undefined") return () => {};

  const before = snapshotCurrentSeo();
  document.title = config.title;

  const descEl = upsertMeta('meta[name="description"]', "name", "description", config.description);
  const robotsValue = config.robots ?? "index,follow";
  const robotsEl = upsertMeta('meta[name="robots"]', "name", "robots", robotsValue);
  const { el: canonicalEl, created: canonicalCreated } = upsertCanonical(
    buildCanonicalUrl(config.canonicalPath),
  );

  return () => {
    document.title = before.title;
    if (before.description !== null) descEl.setAttribute("content", before.description);
    else descEl.remove();
    if (before.robots !== null) robotsEl.setAttribute("content", before.robots);
    else robotsEl.remove();
    if (canonicalCreated) canonicalEl.remove();
    else if (before.canonicalHref !== null) canonicalEl.setAttribute("href", before.canonicalHref);
    else canonicalEl.remove();
  };
}

const PRIVATE_PATH =
  /^\/(?:messages|settings|account|profile|favorites|notifications|login|signup|forgot-password|reset-password|verify-email|admin|new|edit|dev|orders|seller-orders|promote)(?:\/|$)/;

const NOINDEX_PATHS = new Set([
  "/guest-welcome",
]);

export function resolveSeoForPath(pathname: string, locale: Locale): PageSeoConfig {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const path =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || "/" : pathname;

  const defaultDescription = getDefaultSiteDescription(locale);
  const brand = "Souq Arab EU";

  if (PRIVATE_PATH.test(path) || NOINDEX_PATHS.has(path)) {
    return {
      title: getDefaultSiteTitle(locale),
      description: defaultDescription,
      canonicalPath: path,
      robots: "noindex,follow",
    };
  }

  if (path === "/" || path === "") {
    return {
      title: getDefaultSiteTitle(locale),
      description: defaultDescription,
      canonicalPath: "/",
    };
  }

  if (path === "/categories") {
    return {
      title: t("p11.seo.categories_title"),
      description: t("p11.seo.categories_description"),
      canonicalPath: "/categories",
    };
  }

  if (path === "/search") {
    return {
      title: t("p11.seo.search_title"),
      description: defaultDescription,
      canonicalPath: "/search",
    };
  }

  const categoryMatch = path.match(/^\/category\/(\d+)$/);
  if (categoryMatch) {
    return {
      title: t("p11.seo.category_title_generic"),
      description: t("p11.seo.categories_description"),
      canonicalPath: `/category/${categoryMatch[1]}`,
    };
  }

  const adMatch = path.match(/^\/ad\/(\d+)$/);
  if (adMatch) {
    return {
      title: t("p11.seo.ad_title_generic"),
      description: defaultDescription,
      canonicalPath: `/ad/${adMatch[1]}`,
    };
  }

  if (path === "/terms") {
    return {
      title: t("p11.seo.terms_title"),
      description: defaultDescription,
      canonicalPath: "/terms",
    };
  }

  if (path === "/privacy") {
    return {
      title: t("p11.seo.privacy_title"),
      description: defaultDescription,
      canonicalPath: "/privacy",
    };
  }

  if (path === "/delete-account") {
    return {
      title: t("p11.seo.delete_account_title"),
      description: t("p11.seo.delete_account_description"),
      canonicalPath: "/delete-account",
    };
  }

  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    return {
      title: t("p11.seo.user_profile_title"),
      description: defaultDescription,
      canonicalPath: `/users/${userMatch[1]}`,
    };
  }

  return {
    title: `${brand} — ${t("p11.seo.not_found_title")}`,
    description: defaultDescription,
    canonicalPath: path,
    robots: "noindex,follow",
  };
}

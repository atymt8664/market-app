import { useEffect } from "react";
import { useLocation } from "wouter";
import { resolveSeoForPath } from "@/lib/seo-foundation";
import { applyPublicPageMeta } from "@/lib/public-page-meta";
import { useLocale } from "@/hooks/use-locale";

/**
 * Applies route-level SEO (P11-4) + Open Graph / Twitter (P11-5) on public pages.
 * Dynamic pages (ad, category) may override via usePageSeo.
 */
export function SeoRouteSync() {
  const [pathname] = useLocation();
  const { locale } = useLocale();

  useEffect(() => {
    const config = resolveSeoForPath(pathname, locale);
    return applyPublicPageMeta(config, locale);
  }, [pathname, locale]);

  return null;
}

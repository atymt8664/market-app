import { useEffect } from "react";
import { useLocation } from "wouter";
import { applyPageSeo, resolveSeoForPath } from "@/lib/seo-foundation";
import { useLocale } from "@/hooks/use-locale";

/**
 * Applies route-level SEO defaults for public pages (P11-4).
 * Dynamic pages (ad, category) may override via usePageSeo.
 */
export function SeoRouteSync() {
  const [pathname] = useLocation();
  const { locale } = useLocale();

  useEffect(() => {
    const config = resolveSeoForPath(pathname, locale);
    return applyPageSeo(config);
  }, [pathname, locale]);

  return null;
}

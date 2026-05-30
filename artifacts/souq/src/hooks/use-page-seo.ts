import { useEffect } from "react";
import type { PageSeoConfig } from "@/lib/seo-foundation";
import type { PageSocialMetaConfig } from "@/lib/social-meta-foundation";
import { applyAdStructuredDataJsonLd } from "@/lib/ad-structured-data";
import { applyPublicPageMeta } from "@/lib/public-page-meta";
import { useLocale } from "@/hooks/use-locale";

/** Per-page SEO (P11-4) + social meta (P11-5) + optional JSON-LD (P4-1). */
export function usePageSeo(
  config: PageSeoConfig | null | undefined,
  socialOverride?: Partial<PageSocialMetaConfig> | null,
  structuredDataJsonLd?: string | null,
): void {
  const { locale } = useLocale();
  useEffect(() => {
    const cleanupStructured = applyAdStructuredDataJsonLd(
      config && structuredDataJsonLd ? structuredDataJsonLd : null,
    );
    if (!config) return cleanupStructured;
    const cleanupMeta = applyPublicPageMeta(config, locale, socialOverride);
    return () => {
      cleanupMeta();
      cleanupStructured();
    };
  }, [
    config?.title,
    config?.description,
    config?.canonicalPath,
    config?.robots,
    locale,
    socialOverride?.title,
    socialOverride?.description,
    socialOverride?.imageUrl,
    socialOverride?.imageAlt,
    socialOverride?.type,
    structuredDataJsonLd,
  ]);
}

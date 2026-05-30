import { useEffect } from "react";
import type { PageSeoConfig } from "@/lib/seo-foundation";
import type { PageSocialMetaConfig } from "@/lib/social-meta-foundation";
import { applyPublicPageMeta } from "@/lib/public-page-meta";
import { useLocale } from "@/hooks/use-locale";

/** Per-page SEO (P11-4) + social meta (P11-5) override. */
export function usePageSeo(
  config: PageSeoConfig | null | undefined,
  socialOverride?: Partial<PageSocialMetaConfig> | null,
): void {
  const { locale } = useLocale();
  useEffect(() => {
    if (!config) return;
    return applyPublicPageMeta(config, locale, socialOverride);
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
  ]);
}

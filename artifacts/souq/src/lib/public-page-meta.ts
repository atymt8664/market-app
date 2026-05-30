/**
 * P11 — orchestrates P11-4 SEO + P11-5 social meta on public routes.
 */
import type { Locale } from "@/i18n";
import { applyPageSeo, type PageSeoConfig } from "@/lib/seo-foundation";
import {
  applyPageSocialMeta,
  buildSocialMetaFromPageSeo,
  type PageSocialMetaConfig,
} from "@/lib/social-meta-foundation";

export function applyPublicPageMeta(
  config: PageSeoConfig,
  locale: Locale,
  socialOverride?: Partial<PageSocialMetaConfig> | null,
): () => void {
  const cleanupSeo = applyPageSeo(config);
  const social = {
    ...buildSocialMetaFromPageSeo(config, locale),
    ...socialOverride,
  };
  const cleanupSocial = applyPageSocialMeta(social);
  return () => {
    cleanupSocial();
    cleanupSeo();
  };
}

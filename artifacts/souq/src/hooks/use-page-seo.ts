import { useEffect } from "react";
import { applyPageSeo, type PageSeoConfig } from "@/lib/seo-foundation";

/** Per-page SEO override (title, description, canonical, robots). */
export function usePageSeo(config: PageSeoConfig | null | undefined): void {
  useEffect(() => {
    if (!config) return;
    return applyPageSeo(config);
  }, [config?.title, config?.description, config?.canonicalPath, config?.robots]);
}

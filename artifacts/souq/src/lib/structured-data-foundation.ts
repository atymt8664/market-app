/**
 * P11-5 — Structured Data + Knowledge Graph readiness (Organization + WebSite only).
 */
import { SEO_CANONICAL_ORIGIN } from "@/lib/seo-foundation";

export const P11_BRAND_OFFICIAL_NAME = "Souq Arab EU";
export const P11_BRAND_ALTERNATE_NAME_AR = "سوق العرب EU";
export const P11_LOGO_MASTER_URL = `${SEO_CANONICAL_ORIGIN}/brand/logo-master.png`;
export const P11_STRUCTURED_DATA_SCRIPT_ID = "p11-structured-data";

/** Site-wide JSON-LD @graph — no fabricated stats or social profiles. */
export function buildKnowledgeGraphJsonLd(): string {
  const origin = SEO_CANONICAL_ORIGIN;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: P11_BRAND_OFFICIAL_NAME,
        alternateName: [P11_BRAND_ALTERNATE_NAME_AR],
        url: `${origin}/`,
        logo: {
          "@type": "ImageObject",
          url: P11_LOGO_MASTER_URL,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: P11_BRAND_OFFICIAL_NAME,
        alternateName: P11_BRAND_ALTERNATE_NAME_AR,
        publisher: { "@id": `${origin}/#organization` },
        inLanguage: ["ar", "en", "de"],
      },
    ],
  };
  return JSON.stringify(graph);
}

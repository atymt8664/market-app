/**
 * P3-5 — Structured Data (JSON-LD) for homepage Knowledge Graph readiness.
 * Organization + WebSite + WebApplication only — no Product/Offer/ad schemas (P4-1).
 */
import { SEO_CANONICAL_ORIGIN } from "@/lib/seo-foundation";

export const P3_BRAND_OFFICIAL_NAME = "Souq Arab EU";
export const P3_BRAND_ALTERNATE_NAME_AR = "سوق العرب EU";
/** Arabic source-of-truth — matches p11.seo.default_description and index.html meta. */
export const P3_OFFICIAL_DESCRIPTION_AR =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";
export const P3_LOGO_MASTER_URL = `${SEO_CANONICAL_ORIGIN}/brand/logo-master.png`;
export const P3_STRUCTURED_DATA_SCRIPT_ID = "p3-structured-data";

/** @deprecated P11 alias — use P3_* exports */
export const P11_BRAND_OFFICIAL_NAME = P3_BRAND_OFFICIAL_NAME;
/** @deprecated P11 alias */
export const P11_BRAND_ALTERNATE_NAME_AR = P3_BRAND_ALTERNATE_NAME_AR;
/** @deprecated P11 alias */
export const P11_LOGO_MASTER_URL = P3_LOGO_MASTER_URL;
/** @deprecated P11 alias */
export const P11_STRUCTURED_DATA_SCRIPT_ID = P3_STRUCTURED_DATA_SCRIPT_ID;

type JsonLdGraph = {
  "@context": "https://schema.org";
  "@graph": Record<string, unknown>[];
};

/** Site-wide JSON-LD @graph — no fabricated stats, social profiles, or commerce schemas. */
export function buildHomeStructuredDataGraph(): JsonLdGraph {
  const origin = SEO_CANONICAL_ORIGIN;
  const orgId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webappId = `${origin}/#webapp`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: P3_BRAND_OFFICIAL_NAME,
        alternateName: [P3_BRAND_ALTERNATE_NAME_AR],
        url: `${origin}/`,
        description: P3_OFFICIAL_DESCRIPTION_AR,
        logo: {
          "@type": "ImageObject",
          "@id": `${origin}/#logo`,
          url: P3_LOGO_MASTER_URL,
          contentUrl: P3_LOGO_MASTER_URL,
          caption: P3_BRAND_OFFICIAL_NAME,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: `${origin}/`,
        name: P3_BRAND_OFFICIAL_NAME,
        alternateName: P3_BRAND_ALTERNATE_NAME_AR,
        description: P3_OFFICIAL_DESCRIPTION_AR,
        publisher: { "@id": orgId },
        inLanguage: ["ar", "en", "de"],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": webappId,
        name: P3_BRAND_OFFICIAL_NAME,
        alternateName: P3_BRAND_ALTERNATE_NAME_AR,
        url: `${origin}/`,
        description: P3_OFFICIAL_DESCRIPTION_AR,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        publisher: { "@id": orgId },
        isPartOf: { "@id": websiteId },
        inLanguage: ["ar", "en", "de"],
      },
    ],
  };
}

/** Compact JSON string for `<script type="application/ld+json">`. */
export function buildHomeStructuredDataJsonLd(): string {
  return JSON.stringify(buildHomeStructuredDataGraph());
}

/** @deprecated — use buildHomeStructuredDataJsonLd */
export function buildKnowledgeGraphJsonLd(): string {
  return buildHomeStructuredDataJsonLd();
}

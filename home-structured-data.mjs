/**
 * P3-5 / P13-4 — Homepage JSON-LD (Organization + WebSite + WebApplication).
 * Keep in sync with artifacts/souq/src/lib/structured-data-foundation.ts
 */
export const P3_ORIGIN = "https://www.souq-arab.com";
export const P3_BRAND_OFFICIAL_NAME = "Souq Arab EU";
export const P3_BRAND_ALTERNATE_NAME_AR = "سوق العرب EU";
export const P3_OFFICIAL_DESCRIPTION_AR =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";
export const P3_LOGO_MASTER_URL = `${P3_ORIGIN}/brand/logo-master.png`;
export const P3_STRUCTURED_DATA_SCRIPT_ID = "p3-structured-data";

export function buildHomeStructuredDataGraph() {
  const origin = P3_ORIGIN;
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

export function buildHomeStructuredDataJsonLd() {
  return JSON.stringify(buildHomeStructuredDataGraph());
}

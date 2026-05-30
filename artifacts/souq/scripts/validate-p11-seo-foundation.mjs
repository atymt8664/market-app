#!/usr/bin/env node
/**
 * P11-4 — validates static SEO foundation assets (no network).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const OFFICIAL_DESC =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
assert(indexHtml.includes("Souq Arab EU"), "index.html: missing brand Souq Arab EU in title");
assert(indexHtml.includes(OFFICIAL_DESC), "index.html: missing official meta description");
assert(
  indexHtml.includes('rel="canonical" href="https://www.souq-arab.com/"'),
  "index.html: missing canonical to www",
);
assert(indexHtml.includes('name="robots" content="index,follow"'), "index.html: missing robots");

const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
assert(
  robots.includes("Sitemap: https://www.souq-arab.com/sitemap.xml"),
  "robots.txt: missing Sitemap directive",
);

const sitemapPath = join(root, "public/sitemap.xml");
assert(existsSync(sitemapPath), "public/sitemap.xml: missing");
const sitemap = readFileSync(sitemapPath, "utf8");
assert(sitemap.includes("https://www.souq-arab.com/"), "sitemap.xml: missing home URL");
assert(sitemap.includes("/categories"), "sitemap.xml: missing /categories");
assert(sitemap.includes("/delete-account"), "sitemap.xml: missing /delete-account");

const seoTs = readFileSync(join(root, "src/lib/seo-foundation.ts"), "utf8");
assert(
  seoTs.includes('SEO_CANONICAL_ORIGIN = "https://www.souq-arab.com"'),
  "seo-foundation.ts: canonical origin",
);

for (const loc of ["ar.json", "en.json", "de.json"]) {
  const json = readFileSync(join(root, "src/i18n/locales", loc), "utf8");
  assert(json.includes("p11.seo.home_title"), `${loc}: missing p11.seo.home_title`);
  assert(json.includes("p11.seo.default_description"), `${loc}: missing p11.seo.default_description`);
}

if (errors.length) {
  console.error("[P11-4 SEO] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P11-4 SEO] PASS — static foundation assets OK");

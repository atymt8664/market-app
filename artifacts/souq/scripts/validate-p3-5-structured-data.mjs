#!/usr/bin/env node
/**
 * P3-5 — validates homepage JSON-LD (Organization + WebSite + WebApplication).
 * No network. No Product/Offer/ad schemas.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const ORIGIN = "https://www.souq-arab.com";
const BRAND = "Souq Arab EU";
const ALT_NAME = "سوق العرب EU";
const OFFICIAL_DESC =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";
const LOGO = `${ORIGIN}/brand/logo-master.png`;
const SCRIPT_ID = "p3-structured-data";

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function findByType(graph, type) {
  return graph.find((node) => node["@type"] === type);
}

function extractJsonLd(html) {
  const match = html.match(
    new RegExp(
      `<script type="application/ld\\+json" id="${SCRIPT_ID}">\\s*([\\s\\S]*?)\\s*</script>`,
    ),
  );
  assert(match, `index.html: missing JSON-LD script#${SCRIPT_ID}`);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    errors.push("index.html: JSON-LD is not valid JSON");
    return null;
  }
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const parsed = extractJsonLd(indexHtml);

if (parsed) {
  assert(parsed["@context"] === "https://schema.org", "JSON-LD: @context must be schema.org");
  assert(Array.isArray(parsed["@graph"]), "JSON-LD: @graph must be an array");
  assert(parsed["@graph"].length === 3, "JSON-LD: @graph must have exactly 3 nodes (P3-5 scope)");

  const forbiddenTypes = ["Product", "Offer", "ItemList", "BreadcrumbList"];
  for (const node of parsed["@graph"]) {
    const type = node["@type"];
    assert(!forbiddenTypes.includes(type), `JSON-LD: forbidden @type ${type} in P3-5`);
  }

  const org = findByType(parsed["@graph"], "Organization");
  assert(org, "JSON-LD: missing Organization");
  if (org) {
    assert(org["@id"] === `${ORIGIN}/#organization`, "Organization: @id");
    assert(org.name === BRAND, "Organization: name");
    assert(Array.isArray(org.alternateName) && org.alternateName.includes(ALT_NAME), "Organization: alternateName");
    assert(org.url === `${ORIGIN}/`, "Organization: url");
    assert(org.description === OFFICIAL_DESC, "Organization: description");
    assert(org.logo?.url === LOGO, "Organization: logo.url");
    assert(org.logo?.["@type"] === "ImageObject", "Organization: logo @type");
  }

  const site = findByType(parsed["@graph"], "WebSite");
  assert(site, "JSON-LD: missing WebSite");
  if (site) {
    assert(site["@id"] === `${ORIGIN}/#website`, "WebSite: @id");
    assert(site.name === BRAND, "WebSite: name");
    assert(site.description === OFFICIAL_DESC, "WebSite: description");
    assert(site.publisher?.["@id"] === `${ORIGIN}/#organization`, "WebSite: publisher link");
    assert(Array.isArray(site.inLanguage) && site.inLanguage.join(",") === "ar,en,de", "WebSite: inLanguage");
    assert(site.potentialAction?.["@type"] === "SearchAction", "WebSite: SearchAction");
    assert(
      site.potentialAction?.target?.urlTemplate === `${ORIGIN}/search?q={search_term_string}`,
      "WebSite: search urlTemplate",
    );
  }

  const app = findByType(parsed["@graph"], "WebApplication");
  assert(app, "JSON-LD: missing WebApplication");
  if (app) {
    assert(app["@id"] === `${ORIGIN}/#webapp`, "WebApplication: @id");
    assert(app.name === BRAND, "WebApplication: name");
    assert(app.description === OFFICIAL_DESC, "WebApplication: description");
    assert(app.applicationCategory === "BusinessApplication", "WebApplication: applicationCategory");
    assert(app.publisher?.["@id"] === `${ORIGIN}/#organization`, "WebApplication: publisher link");
    assert(app.isPartOf?.["@id"] === `${ORIGIN}/#website`, "WebApplication: isPartOf link");
    assert(!Object.prototype.hasOwnProperty.call(app, "offers"), "WebApplication: no Offer schema in P3-5");
  }
}

const structuredTs = readFileSync(join(root, "src/lib/structured-data-foundation.ts"), "utf8");
assert(structuredTs.includes("P3_OFFICIAL_DESCRIPTION_AR"), "structured-data-foundation.ts: P3 description constant");
assert(structuredTs.includes("WebApplication"), "structured-data-foundation.ts: WebApplication");
assert(structuredTs.includes("SearchAction"), "structured-data-foundation.ts: SearchAction");
assert(structuredTs.includes("buildHomeStructuredDataJsonLd"), "structured-data-foundation.ts: builder export");
assert(!structuredTs.includes("sameAs"), "structured-data-foundation.ts: no unverified sameAs");

const p115 = readFileSync(join(root, "scripts/validate-p11-5-social-meta.mjs"), "utf8");
assert(p115.includes('"@type": "WebApplication"'), "validate-p11-5: must assert WebApplication");

if (errors.length) {
  console.error("[P3-5 Structured Data] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P3-5 Structured Data] PASS — homepage JSON-LD valid (Organization + WebSite + WebApplication)");

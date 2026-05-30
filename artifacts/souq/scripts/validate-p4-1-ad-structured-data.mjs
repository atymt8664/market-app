#!/usr/bin/env node
/**
 * P4-1 — validates ad Product/Offer JSON-LD (unit + static wiring). No network.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAdStructuredDataGraph,
  buildAdStructuredDataJsonLd,
  P4_AD_STRUCTURED_DATA_SCRIPT_ID,
  P4_ORIGIN,
} from "./ad-structured-data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const sampleAd = {
  id: 42,
  title: "iPhone 14 Pro",
  description: "حالة ممتازة، استعمال خفيف.",
  price: 650,
  priceType: "fixed",
  type: "offer",
  city: "Berlin",
  status: "approved",
  categoryName: "إلكترونيات",
  sellerName: "Ahmed",
  images: ["https://example.supabase.co/storage/v1/object/public/ads/photo.jpg"],
};

const graph = buildAdStructuredDataGraph(sampleAd);
assert(graph, "buildAdStructuredDataGraph: must return graph for valid ad");
assert(graph["@context"] === "https://schema.org", "@context");
assert(graph["@graph"].length === 1, "@graph length");

const product = graph["@graph"][0];
assert(product["@type"] === "Product", "Product @type");
assert(product.name === sampleAd.title, "Product name");
assert(product.description === sampleAd.description, "Product description");
assert(product.url === `${P4_ORIGIN}/ad/42`, "Product url");
assert(Array.isArray(product.image) || typeof product.image === "string", "Product image");
assert(product.category === sampleAd.categoryName, "Product category");

const offer = product.offers;
assert(offer["@type"] === "Offer", "Offer @type");
assert(offer.price === "650", "Offer price");
assert(offer.priceCurrency === "EUR", "Offer priceCurrency");
assert(offer.availableAtOrFrom?.name === "Berlin", "Offer city");
assert(offer.additionalProperty?.value === "approved", "Offer listingStatus");
assert(offer.seller?.name === "Ahmed", "Offer seller name");
assert(!Object.prototype.hasOwnProperty.call(offer, "telephone"), "Offer must not expose phone");

const freeGraph = buildAdStructuredDataGraph({
  id: 1,
  title: "Free item",
  priceType: "free",
  status: "approved",
});
assert(freeGraph["@graph"][0].offers.price === "0", "free priceType -> price 0");

const swapGraph = buildAdStructuredDataGraph({
  id: 2,
  title: "Swap item",
  priceType: "swap",
  price: 100,
  status: "approved",
});
assert(!Object.prototype.hasOwnProperty.call(swapGraph["@graph"][0].offers, "price"), "swap omits price");

assert(buildAdStructuredDataGraph({ id: 0, title: "" }) === null, "empty title -> null");
assert(buildAdStructuredDataJsonLd(sampleAd), "JSON string builder");

try {
  JSON.parse(buildAdStructuredDataJsonLd(sampleAd));
} catch {
  errors.push("JSON-LD output must be valid JSON");
}

const adTs = readFileSync(join(root, "src/lib/ad-structured-data.ts"), "utf8");
assert(adTs.includes("buildAdStructuredDataGraph"), "ad-structured-data.ts: graph builder");
assert(adTs.includes("applyAdStructuredDataJsonLd"), "ad-structured-data.ts: DOM apply");
assert(adTs.includes(P4_AD_STRUCTURED_DATA_SCRIPT_ID), "ad-structured-data.ts: script id");

const adDetail = readFileSync(join(root, "src/pages/ad-detail.tsx"), "utf8");
assert(adDetail.includes("buildAdStructuredDataJsonLd"), "ad-detail.tsx: wired JSON-LD");
assert(adDetail.includes("usePageSeo(adPageSeo, adSocialOverride, adStructuredDataJsonLd)"), "ad-detail.tsx: usePageSeo arg");

const usePageSeoTs = readFileSync(join(root, "src/hooks/use-page-seo.ts"), "utf8");
assert(usePageSeoTs.includes("applyAdStructuredDataJsonLd"), "use-page-seo.ts: structured cleanup");

const ogShare = readFileSync(join(root, "scripts/og-share-meta.mjs"), "utf8");
assert(ogShare.includes("buildAdStructuredDataJsonLd"), "og-share-meta.mjs: imports builder");
assert(ogShare.includes("P4_AD_STRUCTURED_DATA_SCRIPT_ID"), "og-share-meta.mjs: script id in HTML");

const rootOg = readFileSync(join(repoRoot, "og-share-meta.mjs"), "utf8");
assert(rootOg.includes("buildAdStructuredDataJsonLd"), "root og-share-meta.mjs: P4-1 wired");
assert(rootOg.includes("P4_AD_STRUCTURED_DATA_SCRIPT_ID"), "root og-share-meta.mjs: script id");

const rootOgHandler = readFileSync(join(repoRoot, "api/og.js"), "utf8");
assert(rootOgHandler.includes("buildAdStructuredDataJsonLd"), "api/og.js: P4-1 wired");

const homeIndex = readFileSync(join(root, "index.html"), "utf8");
assert(!homeIndex.includes('"@type": "Product"'), "homepage must not include Product schema");

const p3Validate = readFileSync(join(root, "scripts/validate-p3-5-structured-data.mjs"), "utf8");
assert(p3Validate.includes('"Product"'), "P3-5 validator forbids Product on homepage");

if (errors.length) {
  console.error("[P4-1 Ads SEO] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P4-1 Ads SEO] PASS — Product/Offer JSON-LD builder and wiring OK");

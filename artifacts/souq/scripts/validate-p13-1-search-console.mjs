#!/usr/bin/env node
/**
 * P13-1 — Search Console readiness (robots, sitemaps, Googlebot ad crawl, SEO foundations).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAdsSitemapXml, P13_ORIGIN } from "./sitemap-ads.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://www.souq-arab.com/sitemap.xml"), "robots.txt: static sitemap");
assert(robots.includes("Sitemap: https://www.souq-arab.com/sitemap-ads.xml"), "robots.txt: ads sitemap");
assert(robots.includes("Disallow: /admin"), "robots.txt: blocks admin");

const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");
assert(sitemap.includes(`${P13_ORIGIN}/`), "sitemap.xml: home on www");
assert(sitemap.includes("/categories"), "sitemap.xml: categories");

assert(existsSync(join(root, "api/sitemap-ads.js")), "api/sitemap-ads.js exists");
assert(existsSync(join(root, "scripts/sitemap-ads.mjs")), "scripts/sitemap-ads.mjs exists");

const vercel = readFileSync(join(root, "vercel.json"), "utf8");
assert(vercel.includes("/sitemap-ads.xml"), "vercel.json: sitemap-ads rewrite");
assert(vercel.includes("Googlebot"), "vercel.json: Googlebot ad prerender");
assert(vercel.includes("/api/sitemap-ads"), "vercel.json: sitemap-ads handler");

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
assert(indexHtml.includes('id="p3-structured-data"'), "index.html: P3-5 JSON-LD");
assert(indexHtml.includes('rel="canonical" href="https://www.souq-arab.com/"'), "index.html: www canonical");

const seoTs = readFileSync(join(root, "src/lib/seo-foundation.ts"), "utf8");
assert(seoTs.includes('SEO_CANONICAL_ORIGIN = "https://www.souq-arab.com"'), "seo-foundation: www origin");

const adTs = readFileSync(join(root, "src/lib/ad-structured-data.ts"), "utf8");
assert(adTs.includes("Product"), "ad-structured-data: Product schema");

try {
  const xml = await buildAdsSitemapXml(fetch);
  assert(xml.includes("<urlset"), "ads sitemap: urlset");
  assert(xml.includes("/ad/"), "ads sitemap: contains ad URLs");
  assert(!xml.includes("/admin"), "ads sitemap: no admin URLs");
} catch (e) {
  errors.push(`ads sitemap live build: ${e instanceof Error ? e.message : "failed"}`);
}

if (errors.length) {
  console.error("[P13-1 GSC Readiness] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P13-1 GSC Readiness] PASS — robots, sitemaps, Googlebot wiring, SEO foundations OK");

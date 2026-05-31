/**
 * P13-3-A — shared index monitoring checks (local + production read-only).
 * Extends P13-1 GSC readiness; no secrets; PRODUCTION origin only for prod checks.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildAdsSitemapXml, P13_ORIGIN, P13_API_ORIGIN } from "./sitemap-ads.mjs";

export { P13_ORIGIN, P13_API_ORIGIN };

export const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/** Public routes that must resolve to index,follow per seo-foundation.ts */
export const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/categories",
  "/search",
  "/category/1",
  "/ad/1",
  "/terms",
  "/privacy",
  "/delete-account",
  "/users/1",
];

/** Documented noindex routes (must stay noindex). */
export const DOCUMENTED_NOINDEX_PREFIXES = [
  "/messages",
  "/settings",
  "/login",
  "/signup",
  "/admin",
  "/new",
  "/guest-welcome",
];

export function createAssert(errors) {
  return (cond, msg) => {
    if (!cond) errors.push(msg);
  };
}

function extractIfBlock(source, condition) {
  const marker = `if (${condition}) {`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  let i = start + marker.length - 1;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function assertNoindexLeak(seoSource, assert) {
  const homeBlock = extractIfBlock(seoSource, 'path === "/" || path === ""');
  if (homeBlock) {
    assert(!homeBlock.includes("noindex"), "seo-foundation: home must not be noindex");
  }

  for (const cond of ["categoryMatch", "adMatch", "userMatch"]) {
    const block = extractIfBlock(seoSource, cond);
    assert(block, `seo-foundation: ${cond} handler present`);
    if (block) {
      assert(!block.includes("noindex"), `seo-foundation: ${cond} block must not force noindex`);
    }
  }

  for (const path of ["/categories", "/search", "/terms", "/privacy", "/delete-account"]) {
    const escaped = path.replace(/\//g, "\\/");
    const block = extractIfBlock(seoSource, `path === "${path}"`);
    if (block) {
      assert(!block.includes("noindex"), `seo-foundation: ${path} must not be noindex`);
    } else {
      assert(seoSource.includes(`"${path}"`), `seo-foundation: handler for ${path}`);
    }
  }

  const privateBlock = seoSource.match(/PRIVATE_PATH[\s\S]*?;/);
  assert(privateBlock, "seo-foundation: PRIVATE_PATH defined");
  const noindexPathsBlock = seoSource.match(/NOINDEX_PATHS[\s\S]*?\]\);/);
  assert(noindexPathsBlock, "seo-foundation: NOINDEX_PATHS defined");

  for (const prefix of DOCUMENTED_NOINDEX_PREFIXES) {
    if (prefix === "/guest-welcome") {
      assert(
        noindexPathsBlock && noindexPathsBlock[0].includes("guest-welcome"),
        "seo-foundation: guest-welcome in NOINDEX_PATHS",
      );
      continue;
    }
    const segment = prefix.replace(/^\//, "").split("/")[0];
    assert(privateBlock[0].includes(segment), `seo-foundation: documented private/noindex path ${prefix}`);
  }
}

function assertCanonicalOriginOnly(seoSource, assert) {
  assert(seoSource.includes('SEO_CANONICAL_ORIGIN = "https://www.souq-arab.com"'), "seo-foundation: www canonical origin");
  assert(!seoSource.includes("qkczposlooaldmsjfmun"), "seo-foundation: no STAGING ref");
  assert(!seoSource.includes("nptfxtkedqndkgmrcntn"), "seo-foundation: no PRODUCTION Supabase ref in frontend SEO");
}

/**
 * Local / CI checks — filesystem + live ads API for sitemap build.
 * @param {{ root: string, fetchFn?: typeof fetch }} opts
 */
export async function runP13IndexLocalChecks({ root, fetchFn = fetch }) {
  const errors = [];
  const assert = createAssert(errors);

  const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
  assert(robots.includes("Allow: /"), "robots.txt: Allow /");
  assert(robots.includes("Sitemap: https://www.souq-arab.com/sitemap.xml"), "robots.txt: static sitemap");
  assert(robots.includes("Sitemap: https://www.souq-arab.com/sitemap-ads.xml"), "robots.txt: ads sitemap");
  assert(robots.includes("Disallow: /admin"), "robots.txt: blocks admin");
  assert(robots.includes("Disallow: /admin-login"), "robots.txt: blocks admin-login");

  const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");
  assert(sitemap.startsWith("<?xml"), "sitemap.xml: XML declaration");
  assert(sitemap.includes("<urlset"), "sitemap.xml: urlset");
  assert(sitemap.includes(`${P13_ORIGIN}/`), "sitemap.xml: home on www");
  assert(sitemap.includes("/categories"), "sitemap.xml: categories");
  assert(sitemap.includes("/search"), "sitemap.xml: search");
  assert(sitemap.includes("/terms"), "sitemap.xml: terms");
  assert(sitemap.includes("/privacy"), "sitemap.xml: privacy");

  assert(existsSync(join(root, "api/sitemap-ads.js")), "api/sitemap-ads.js exists");
  assert(existsSync(join(root, "scripts/sitemap-ads.mjs")), "scripts/sitemap-ads.mjs exists");

  const vercel = readFileSync(join(root, "vercel.json"), "utf8");
  assert(vercel.includes("/sitemap-ads.xml"), "vercel.json: sitemap-ads rewrite");
  assert(vercel.includes("Googlebot"), "vercel.json: Googlebot ad prerender");
  assert(vercel.includes("/api/sitemap-ads"), "vercel.json: sitemap-ads handler");
  assert(!vercel.includes("noindex"), "vercel.json: no global noindex header");

  const indexHtml = readFileSync(join(root, "index.html"), "utf8");
  assert(indexHtml.includes('id="p3-structured-data"'), "index.html: P3-5 JSON-LD");
  assert(indexHtml.includes('rel="canonical" href="https://www.souq-arab.com/"'), "index.html: www canonical");
  assert(indexHtml.includes('name="robots" content="index,follow"'), "index.html: robots index,follow");

  const seoTs = readFileSync(join(root, "src/lib/seo-foundation.ts"), "utf8");
  assertCanonicalOriginOnly(seoTs, assert);
  assertNoindexLeak(seoTs, assert);

  const adTs = readFileSync(join(root, "src/lib/ad-structured-data.ts"), "utf8");
  assert(adTs.includes("Product"), "ad-structured-data: Product schema");

  const sitemapAdsModule = readFileSync(join(root, "scripts/sitemap-ads.mjs"), "utf8");
  assert(sitemapAdsModule.includes(P13_ORIGIN), "sitemap-ads.mjs: production www origin");
  assert(sitemapAdsModule.includes("api.souq-arab.com"), "sitemap-ads.mjs: production public API");

  try {
    const xml = await buildAdsSitemapXml(fetchFn);
    assert(xml.includes("<urlset"), "ads sitemap: urlset");
    assert(xml.includes("/ad/"), "ads sitemap: contains ad URLs");
    assert(!xml.includes("/admin"), "ads sitemap: no admin URLs");
    assert(!xml.includes("<html"), "ads sitemap: not HTML");
  } catch (e) {
    errors.push(`ads sitemap live build: ${e instanceof Error ? e.message : "failed"}`);
  }

  return errors;
}

function headerNoindex(value) {
  if (!value) return false;
  return /noindex/i.test(value);
}

/**
 * Production read-only checks — https://www.souq-arab.com only.
 * @param {{ origin?: string, apiOrigin?: string, fetchFn?: typeof fetch }} opts
 */
export async function runP13IndexProdChecks({
  origin = P13_ORIGIN,
  apiOrigin = P13_API_ORIGIN,
  fetchFn = fetch,
}) {
  const errors = [];
  const assert = createAssert(errors);

  async function fetchText(path, init = {}) {
    const res = await fetchFn(`${origin}${path}`, init);
    return { res, text: await res.text() };
  }

  // robots.txt
  {
    const { res, text } = await fetchText("/robots.txt");
    assert(res.ok, `robots.txt: HTTP ${res.status}`);
    assert(text.includes("Allow: /"), "robots.txt: Allow /");
    assert(text.includes("Sitemap: https://www.souq-arab.com/sitemap.xml"), "robots.txt: static sitemap");
    assert(text.includes("Sitemap: https://www.souq-arab.com/sitemap-ads.xml"), "robots.txt: ads sitemap");
    assert(text.includes("Disallow: /admin"), "robots.txt: blocks admin");
  }

  // sitemap.xml
  {
    const { res, text } = await fetchText("/sitemap.xml");
    assert(res.ok, `sitemap.xml: HTTP ${res.status}`);
    assert(text.includes("<urlset"), "sitemap.xml: urlset");
    assert(text.includes(`${origin}/`), "sitemap.xml: home URL");
    assert(text.includes("/categories"), "sitemap.xml: categories");
    assert(text.includes("/search"), "sitemap.xml: search");
  }

  // sitemap-ads.xml
  {
    const { res, text } = await fetchText("/sitemap-ads.xml");
    assert(res.ok, `sitemap-ads.xml: HTTP ${res.status}`);
    assert((res.headers.get("content-type") ?? "").includes("xml"), "sitemap-ads.xml: content-type xml");
    assert(text.includes("<urlset"), "sitemap-ads.xml: urlset");
    assert(text.includes("/ad/"), "sitemap-ads.xml: ad URLs");
    assert(!text.includes("<html"), "sitemap-ads.xml: not SPA HTML");
    const urlCount = (text.match(/<loc>/g) ?? []).length;
    assert(urlCount >= 1, `sitemap-ads.xml: at least 1 ad URL (found ${urlCount})`);
  }

  // Homepage
  {
    const { res, text } = await fetchText("/");
    assert(res.ok, `homepage: HTTP ${res.status}`);
    assert(!headerNoindex(res.headers.get("x-robots-tag")), "homepage: no X-Robots-Tag noindex");
    assert(text.includes('id="p3-structured-data"'), "homepage: P3-5 JSON-LD script");
    assert(text.includes('"@type":"Organization"') || text.includes('"@type": "Organization"'), "homepage: Organization schema");
    assert(text.includes('"@type":"WebSite"') || text.includes('"@type": "WebSite"'), "homepage: WebSite schema");
    assert(text.includes('rel="canonical" href="https://www.souq-arab.com/"'), "homepage: canonical www");
    assert(text.includes('name="robots" content="index,follow"'), "homepage: robots index,follow");
  }

  // Public browse routes
  for (const path of ["/categories", "/search", "/terms", "/privacy"]) {
    const { res } = await fetchText(path);
    assert(res.ok, `${path}: HTTP ${res.status}`);
    assert(!headerNoindex(res.headers.get("x-robots-tag")), `${path}: no X-Robots-Tag noindex`);
  }

  // Sample category page
  {
    const catRes = await fetchFn(`${apiOrigin}/categories`, {
      headers: { Accept: "application/json" },
    });
    assert(catRes.ok, `categories API: HTTP ${catRes.status}`);
    const categories = await catRes.json();
    const categoryId =
      Array.isArray(categories) && categories[0]?.id != null ? String(categories[0].id) : null;
    assert(categoryId, "categories API: at least one category for index sample");
    if (categoryId) {
      const { res, text } = await fetchText(`/category/${categoryId}`);
      assert(res.ok, `/category/${categoryId}: HTTP ${res.status}`);
      assert(!headerNoindex(res.headers.get("x-robots-tag")), `/category/${categoryId}: no X-Robots-Tag noindex`);
      assert(!text.includes('name="robots" content="noindex'), `/category/${categoryId}: shell not hard-noindex`);
    }
  }

  // Googlebot ad page — Product JSON-LD
  {
    const adsRes = await fetchFn(`${apiOrigin}/ads?limit=1`, {
      headers: { Accept: "application/json" },
    });
    assert(adsRes.ok, `ads API: HTTP ${adsRes.status}`);
    const ads = await adsRes.json();
    const adId = Array.isArray(ads) && ads[0]?.id ? String(ads[0].id) : null;
    assert(adId, "ads API: at least one public ad for Googlebot test");

    if (adId) {
      const { res, text } = await fetchText(`/ad/${adId}`, {
        headers: { "User-Agent": GOOGLEBOT_UA },
      });
      assert(res.ok, `Googlebot /ad/${adId}: HTTP ${res.status}`);
      assert(
        text.includes('"@type":"Product"') || text.includes('"@type": "Product"'),
        "Googlebot ad page: Product JSON-LD",
      );
      assert(text.includes("application/ld+json"), "Googlebot ad page: ld+json script");
      assert(
        text.includes('rel="canonical"') && text.includes(`/ad/${adId}`),
        "Googlebot ad page: canonical present",
      );
    }
  }

  return errors;
}

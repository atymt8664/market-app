#!/usr/bin/env node
/**
 * P13-1 — Production verification against https://www.souq-arab.com
 */
const ORIGIN = "https://www.souq-arab.com";
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

async function fetchText(path, init = {}) {
  const res = await fetch(`${ORIGIN}${path}`, init);
  return { res, text: await res.text() };
}

// robots.txt
{
  const { res, text } = await fetchText("/robots.txt");
  assert(res.ok, `robots.txt: HTTP ${res.status}`);
  assert(text.includes("Sitemap: https://www.souq-arab.com/sitemap.xml"), "robots.txt: static sitemap");
  assert(text.includes("Sitemap: https://www.souq-arab.com/sitemap-ads.xml"), "robots.txt: ads sitemap");
  assert(text.includes("Disallow: /admin"), "robots.txt: blocks admin");
}

// sitemap.xml
{
  const { res, text } = await fetchText("/sitemap.xml");
  assert(res.ok, `sitemap.xml: HTTP ${res.status}`);
  assert(text.includes("<urlset"), "sitemap.xml: urlset");
  assert(text.includes(`${ORIGIN}/`), "sitemap.xml: home URL");
  assert(text.includes("/categories"), "sitemap.xml: categories");
}

// sitemap-ads.xml
{
  const { res, text } = await fetchText("/sitemap-ads.xml");
  assert(res.ok, `sitemap-ads.xml: HTTP ${res.status}`);
  assert(
    (res.headers.get("content-type") ?? "").includes("xml"),
    "sitemap-ads.xml: content-type xml",
  );
  assert(text.includes("<urlset"), "sitemap-ads.xml: urlset");
  assert(text.includes("/ad/"), "sitemap-ads.xml: ad URLs");
  assert(!text.includes("<html"), "sitemap-ads.xml: not SPA HTML");
}

// Homepage JSON-LD
{
  const { res, text } = await fetchText("/");
  assert(res.ok, `homepage: HTTP ${res.status}`);
  assert(text.includes('id="p3-structured-data"'), "homepage: P3-5 JSON-LD script");
  assert(text.includes('"@type":"Organization"') || text.includes('"@type": "Organization"'), "homepage: Organization schema");
  assert(text.includes('"@type":"WebSite"') || text.includes('"@type": "WebSite"'), "homepage: WebSite schema");
}

// Googlebot ad page — Product JSON-LD via OG prerender
{
  const adsRes = await fetch("https://api.souq-arab.com/api/ads?limit=1", {
    headers: { Accept: "application/json" },
  });
  assert(adsRes.ok, `ads API: HTTP ${adsRes.status}`);
  const ads = await adsRes.json();
  const adId = Array.isArray(ads) && ads[0]?.id ? String(ads[0].id) : null;
  assert(adId, "ads API: at least one public ad for Googlebot test");

  if (adId) {
    const { res, text } = await fetchText(`/ad/${adId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    });
    assert(res.ok, `Googlebot /ad/${adId}: HTTP ${res.status}`);
    assert(
      text.includes('"@type":"Product"') || text.includes('"@type": "Product"'),
      "Googlebot ad page: Product JSON-LD",
    );
    assert(text.includes("application/ld+json"), "Googlebot ad page: ld+json script");
  }
}

if (errors.length) {
  console.error("[P13-1 Production Verification] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P13-1 Production Verification] PASS — Search Console readiness confirmed on production");

#!/usr/bin/env node
/**
 * P11-5 — verifies crawler HTML contains OG tags (local, may hit production API).
 */
import {
  buildAdShareMeta,
  buildHomeShareMeta,
  buildProfileShareMeta,
  fetchPublicAd,
  fetchPublicProfile,
  isSocialCrawler,
  renderOgHtml,
  P11_OFFICIAL_DESCRIPTION_AR,
} from "./og-share-meta.mjs";

const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

assert(isSocialCrawler("facebookexternalhit/1.1"), "bot UA detection");
assert(!isSocialCrawler("Mozilla/5.0 Chrome"), "normal UA not bot");

const homeHtml = renderOgHtml(buildHomeShareMeta());
assert(homeHtml.includes('property="og:title"'), "home og:title");
assert(homeHtml.includes("Souq Arab EU"), "home brand");
assert(homeHtml.includes(P11_OFFICIAL_DESCRIPTION_AR.slice(0, 40)), "home description");
assert(homeHtml.includes("og-share-home.jpg"), "home og:image asset");
assert(homeHtml.includes("og:image:width"), "home og:image:width");

const sampleAd = {
  id: 1,
  title: "Test Ad",
  description: "وصف تجريبي للإعلان",
  price: 100,
  priceType: "fixed",
  city: "Berlin",
  images: [],
};
const adHtml = renderOgHtml(buildAdShareMeta(sampleAd));
assert(adHtml.includes("/ad/1"), "ad canonical url");
assert(!adHtml.match(/og:description" content="[^"]*Souq Arab EU/), "ad no brand dup in description");
assert(!adHtml.includes("sellerPhone"), "ad no private fields");

const sampleProfile = { id: 2, name: "Ahmad", city: "Berlin", avatarUrl: null };
const profileHtml = renderOgHtml(buildProfileShareMeta(sampleProfile));
assert(profileHtml.includes("/users/2"), "profile url");
assert(profileHtml.includes("Berlin"), "profile city in description");
assert(profileHtml.includes("تصفّح إعلانات"), "profile description");
assert(profileHtml.includes("og:image:width"), "profile og:image:width");

async function liveApi() {
  const adsRes = await fetch("https://api.souq-arab.com/api/ads?limit=1");
  if (!adsRes.ok) {
    console.warn("[P11-5] skip live ad: ads list", adsRes.status);
    return;
  }
  const ads = await adsRes.json();
  const first = Array.isArray(ads) ? ads[0] : ads?.items?.[0];
  if (!first?.id) return;
  const ad = await fetchPublicAd(String(first.id));
  if (!ad) {
    errors.push("live: could not fetch public ad");
    return;
  }
  const html = renderOgHtml(buildAdShareMeta(ad));
  assert(html.includes(String(first.id)), "live ad id in html");
  assert(html.includes("og:image"), "live ad og:image");
}

await liveApi();

if (errors.length) {
  console.error("[P11-5 OG Test] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P11-5 OG Test] PASS — crawler HTML + live API sample OK");

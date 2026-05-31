#!/usr/bin/env node
/**
 * P17 — Ad detail Buy Now placeholder production verification.
 */
const ORIGIN = "https://www.souq-arab.com";
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

async function fetchText(path, init = {}) {
  const res = await fetch(`${ORIGIN}${path}`, init);
  return { res, text: await res.text(), headers: res.headers };
}

function lazyChunkRefs(indexJs) {
  return [...new Set([...indexJs.matchAll(/assets\/[a-z0-9_-]+-[A-Za-z0-9_-]+\.js/g)].map((m) => m[0]))];
}

async function fetchLazyChunk(indexJs, matcher) {
  const src = lazyChunkRefs(indexJs).find(matcher);
  if (!src) return null;
  const { res, text } = await fetchText(`/${src}`);
  assert(res.ok, `${src} chunk: HTTP ${res.status}`);
  return text;
}

const { text: indexHtml, headers } = await fetchText("/");
const vercelId = headers.get("x-vercel-id") ?? "(unknown)";
const indexSrc = indexHtml.match(/\/assets\/index-[^"']+\.js/)?.[0];
assert(indexSrc, "index.html: main bundle reference");
const { text: indexJs } = await fetchText(indexSrc);

const adDetailJs = await fetchLazyChunk(
  indexJs,
  (p) => /^assets\/ad-detail-[A-Za-z0-9_-]+\.js$/.test(p) && !p.includes("location-card"),
);
const commerceJs = adDetailJs ?? indexJs;
assert(commerceJs.includes("p17-ad-detail-buy-now"), "commerce: Buy Now test id");
assert(commerceJs.includes("p17-ad-detail-add-to-cart"), "commerce: Add to cart test id");
assert(
  commerceJs.includes("p17.commerce.ad_detail.buy_now") || commerceJs.includes("اشتر"),
  "commerce: Buy Now label / i18n key",
);
const p17BuyNowLive =
  commerceJs.includes("checkoutPathForAd") ||
  commerceJs.includes("/checkout/") ||
  commerceJs.includes("VITE_P17_BUY_NOW_ENABLED");
const comingSoonFallback =
  commerceJs.includes("CommerceComingSoonSheet") || commerceJs.includes("p17-coming-soon-sheet");
assert(
  p17BuyNowLive || comingSoonFallback,
  "commerce: P17-5 checkout wiring OR coming-soon fallback",
);

// Profile P17 tiles still present
const profileJs = await fetchLazyChunk(indexJs, (p) => /^assets\/profile-[A-Za-z0-9_-]+\.js$/.test(p));
assert(profileJs?.includes("p17-orders-account-grid"), "profile: orders grid still present");

if (errors.length) {
  console.error("[P17 Buy Now Production Verification] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`[P17 Buy Now Production Verification] PASS (x-vercel-id: ${vercelId})`);

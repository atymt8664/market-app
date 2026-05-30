#!/usr/bin/env node
/**
 * P17 Recovery — Production verification (frontend shell + P17 bundles).
 * Scope: P17-0..P17-4 (profile commerce tiles, /orders, /seller-orders). NOT P17-5 Buy Now.
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

// SPA routes return shell
for (const path of ["/orders", "/seller-orders", "/profile"]) {
  const { res, text } = await fetchText(path);
  assert(res.ok, `${path}: HTTP ${res.status}`);
  assert(text.includes("/assets/") || text.includes('id="root"'), `${path}: SPA shell`);
}

const { text: indexHtml, headers } = await fetchText("/");
const vercelId = headers.get("x-vercel-id") ?? "(unknown)";
const indexSrc = indexHtml.match(/\/assets\/index-[^"']+\.js/)?.[0];
assert(indexSrc, "index.html: main bundle reference");
const { text: indexJs } = await fetchText(indexSrc);

const profileJs = await fetchLazyChunk(indexJs, (p) => /^assets\/profile-[A-Za-z0-9_-]+\.js$/.test(p));
const ordersJs = await fetchLazyChunk(indexJs, (p) => p.includes("orders-page-"));
const adDetailJs = await fetchLazyChunk(indexJs, (p) => /^assets\/ad-detail-[A-Za-z0-9_-]+\.js$/.test(p));

assert(profileJs?.includes("p17-orders-account-grid"), "profile bundle: p17-orders-account-grid test id");
assert(profileJs?.includes("p17-preview-buyer-orders"), "profile bundle: buyer orders tile test id");
assert(profileJs?.includes("p17-preview-seller-orders"), "profile bundle: seller orders tile test id");
assert(
  profileJs?.includes("entry_buyer_title") && profileJs?.includes("entry_seller_title"),
  "profile bundle: commerce entry i18n keys",
);

assert(ordersJs?.includes("p17.commerce.page.buyer_title"), "orders-page bundle: buyer hub title key");
assert(ordersJs?.includes("p17.commerce.page.seller_title"), "orders-page bundle: seller hub title key");

if (adDetailJs) {
  assert(adDetailJs.includes("p17-ad-detail-buy-now"), "ad-detail: Buy Now placeholder present");
}

if (errors.length) {
  console.error("[P17 Recovery Production Verification] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`[P17 Recovery Production Verification] PASS — P17-0..P17-4 frontend on production (x-vercel-id: ${vercelId})`);

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
  return { res, text: await res.text() };
}

function assetScripts(html) {
  return [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]);
}

async function findChunk(html, prefix) {
  const src = assetScripts(html).find((p) => p.includes(prefix));
  if (!src) return null;
  const { res, text } = await fetchText(src);
  assert(res.ok, `${prefix} chunk: HTTP ${res.status}`);
  return text;
}

// SPA routes return shell
for (const path of ["/orders", "/seller-orders", "/profile"]) {
  const { res, text } = await fetchText(path);
  assert(res.ok, `${path}: HTTP ${res.status}`);
  assert(text.includes("/assets/") || text.includes('id="root"'), `${path}: SPA shell`);
}

// Index + P17 bundles
const { text: indexHtml } = await fetchText("/");
const profileJs = await findChunk(indexHtml, "profile-");
const ordersJs = await findChunk(indexHtml, "orders-page-");

assert(profileJs?.includes("p17-orders-account-grid"), "profile bundle: p17-orders-account-grid test id");
assert(
  profileJs?.includes("طلباتي") || profileJs?.includes("p17.commerce.page.entry_buyer_title"),
  "profile bundle: buyer orders entry (طلباتي / i18n key)",
);
assert(
  profileJs?.includes("إدارة الطلبات") || profileJs?.includes("p17.commerce.page.entry_seller_title"),
  "profile bundle: seller orders entry (إدارة الطلبات / i18n key)",
);

assert(ordersJs?.includes("p17.commerce.page.buyer_title"), "orders-page bundle: buyer hub title key");
assert(ordersJs?.includes("p17.commerce.page.seller_title"), "orders-page bundle: seller hub title key");

// P17-5 Buy Now must NOT appear on ad detail bundle
const adDetailJs = await findChunk(indexHtml, "ad-detail-");
assert(adDetailJs, "ad-detail chunk present");
assert(
  !adDetailJs.includes("p17.commerce.buy_now") && !adDetailJs.includes("اشترِ الآن"),
  "ad-detail: no P17-5 Buy Now (out of recovery scope)",
);

if (errors.length) {
  console.error("[P17 Recovery Production Verification] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P17 Recovery Production Verification] PASS — P17-0..P17-4 frontend surfaces confirmed on production");

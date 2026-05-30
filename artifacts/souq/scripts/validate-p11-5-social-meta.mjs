#!/usr/bin/env node
/**
 * P11-5 — validates Open Graph, Twitter Cards, and JSON-LD foundation (no network).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ORIGIN = "https://www.souq-arab.com";

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");

for (const prop of [
  "og:title",
  "og:description",
  "og:url",
  "og:type",
  "og:site_name",
  "og:locale",
  "og:image",
]) {
  assert(indexHtml.includes(`property="${prop}"`), `index.html: missing ${prop}`);
}

assert(indexHtml.includes('content="Souq Arab EU"'), "index.html: og:site_name must be Souq Arab EU");
assert(indexHtml.includes(`${ORIGIN}/brand/logo-master.png`), "index.html: og:image must use Logo Master");
assert(indexHtml.includes('name="twitter:card"'), "index.html: missing twitter:card");
assert(indexHtml.includes('name="twitter:title"'), "index.html: missing twitter:title");
assert(indexHtml.includes('name="twitter:image"'), "index.html: missing twitter:image");
assert(indexHtml.includes('type="application/ld+json"'), "index.html: missing JSON-LD");
assert(indexHtml.includes('"@type": "Organization"'), "index.html: missing Organization schema");
assert(indexHtml.includes('"@type": "WebSite"'), "index.html: missing WebSite schema");
assert(indexHtml.includes('"name": "Souq Arab EU"'), "index.html: missing brand in JSON-LD");

const socialTs = readFileSync(join(root, "src/lib/social-meta-foundation.ts"), "utf8");
assert(socialTs.includes("applyPageSocialMeta"), "social-meta-foundation.ts: applyPageSocialMeta");
assert(socialTs.includes("twitter:card"), "social-meta-foundation.ts: Twitter cards");

const structuredTs = readFileSync(join(root, "src/lib/structured-data-foundation.ts"), "utf8");
assert(structuredTs.includes("Organization"), "structured-data-foundation.ts: Organization");
assert(structuredTs.includes("WebSite"), "structured-data-foundation.ts: WebSite");
assert(!structuredTs.includes("sameAs"), "structured-data-foundation.ts: no unverified sameAs");

const orchestrator = readFileSync(join(root, "src/lib/public-page-meta.ts"), "utf8");
assert(orchestrator.includes("applyPublicPageMeta"), "public-page-meta.ts: orchestrator");

const routeSync = readFileSync(join(root, "src/components/seo-route-sync.tsx"), "utf8");
assert(routeSync.includes("applyPublicPageMeta"), "seo-route-sync.tsx: wired to P11-5");

const ogShare = readFileSync(join(root, "scripts/og-share-meta.mjs"), "utf8");
assert(ogShare.includes("buildAdShareMeta"), "og-share-meta.mjs: ad builder");
assert(ogShare.includes("buildProfileShareMeta"), "og-share-meta.mjs: profile builder");

const repoRoot = join(root, "..", "..");
assert(existsSync(join(repoRoot, "api/og.js")), "api/og.js: crawler handler");
assert(existsSync(join(repoRoot, "middleware.js")), "middleware.js: bot rewrite");

const socialTsFull = readFileSync(join(root, "src/lib/social-meta-foundation.ts"), "utf8");
assert(socialTsFull.includes("buildAdSocialOverride"), "social-meta: ad override");
assert(socialTsFull.includes("buildProfileSocialOverride"), "social-meta: profile override");

if (errors.length) {
  console.error("[P11-5 Social] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("[P11-5 Social] PASS — OG, Twitter, JSON-LD foundation OK");

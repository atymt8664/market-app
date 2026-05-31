/**
 * P13-4 — shared AI discoverability + Knowledge Graph readiness checks.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  BINGBOT_UA,
  CLAUDEBOT_UA,
  GPTBOT_UA,
  PERPLEXITYBOT_UA,
  VERCEL_DISCOVERY_UA_FRAGMENT,
} from "./p13-4-discovery-crawler-ua.mjs";
import { buildHomeStructuredDataJsonLd, P3_STRUCTURED_DATA_SCRIPT_ID } from "./home-structured-data.mjs";
import { P13_ORIGIN, P13_API_ORIGIN, GOOGLEBOT_UA } from "./p13-3-index-monitor-lib.mjs";

export {
  P13_ORIGIN,
  P13_API_ORIGIN,
  BINGBOT_UA,
  GPTBOT_UA,
  CLAUDEBOT_UA,
  PERPLEXITYBOT_UA,
  GOOGLEBOT_UA,
  VERCEL_DISCOVERY_UA_FRAGMENT,
};

export function createAssert(errors) {
  return (cond, msg) => {
    if (!cond) errors.push(msg);
  };
}

function hasJsonLdType(html, type) {
  return html.includes(`"@type":"${type}"`) || html.includes(`"@type": "${type}"`);
}

async function resolveSampleAdId(fetchFn = fetch) {
  try {
    const res = await fetchFn(`${P13_API_ORIGIN}/ads?limit=1`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const ads = await res.json();
    return Array.isArray(ads) && ads[0]?.id ? String(ads[0].id) : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ root: string, repoRoot?: string }} opts
 */
export function runP13DiscoverabilityLocalChecks({ root, repoRoot }) {
  const errors = [];
  const assert = createAssert(errors);
  const monorepoRoot = repoRoot ?? join(root, "../..");

  const llms = readFileSync(join(root, "public/llms.txt"), "utf8");
  assert(llms.includes("Souq Arab EU"), "llms.txt: brand name");
  assert(llms.includes(P13_ORIGIN), "llms.txt: canonical origin");
  assert(llms.includes("/sitemap.xml"), "llms.txt: static sitemap");
  assert(llms.includes("Organization"), "llms.txt: documents Organization schema");
  assert(llms.includes("Product"), "llms.txt: documents Product schema");

  const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
  assert(robots.includes("llms.txt"), "robots.txt: references llms.txt");
  assert(robots.includes("User-agent: GPTBot"), "robots.txt: GPTBot rule");
  assert(robots.includes("User-agent: Bingbot"), "robots.txt: Bingbot rule");
  assert(robots.includes("User-agent: ClaudeBot"), "robots.txt: ClaudeBot rule");
  assert(robots.includes("Disallow: /admin"), "robots.txt: blocks admin for AI bots");

  assert(existsSync(join(root, "scripts/home-structured-data.mjs")), "home-structured-data.mjs exists");
  assert(existsSync(join(root, "scripts/p13-4-discovery-crawler-ua.mjs")), "p13-4-discovery-crawler-ua.mjs exists");

  const vercelSouq = readFileSync(join(root, "vercel.json"), "utf8");
  assert(vercelSouq.includes("Bingbot"), "vercel.json (souq): Bingbot in crawler rewrites");
  assert(vercelSouq.includes("GPTBot"), "vercel.json (souq): GPTBot in crawler rewrites");
  assert(vercelSouq.includes("llms.txt"), "vercel.json (souq): llms.txt excluded from SPA fallback");

  const vercelRoot = readFileSync(join(monorepoRoot, "vercel.json"), "utf8");
  assert(vercelRoot.includes(VERCEL_DISCOVERY_UA_FRAGMENT), "vercel.json (root): discovery UA fragment");
  assert(vercelRoot.includes("llms.txt"), "vercel.json (root): llms.txt excluded from SPA fallback");

  const ogShare = readFileSync(join(root, "scripts/og-share-meta.mjs"), "utf8");
  assert(ogShare.includes("buildHomeStructuredDataJsonLd"), "og-share-meta.mjs: home JSON-LD builder wired");
  assert(ogShare.includes("P3_STRUCTURED_DATA_SCRIPT_ID"), "og-share-meta.mjs: P3 script id export");

  const ogApi = readFileSync(join(root, "api/og.js"), "utf8");
  assert(ogApi.includes("buildHomeStructuredDataJsonLd"), "api/og.js: home JSON-LD on route=home");

  const rootOgShare = readFileSync(join(monorepoRoot, "og-share-meta.mjs"), "utf8");
  assert(rootOgShare.includes("buildHomeStructuredDataJsonLd"), "root og-share-meta.mjs: home JSON-LD wired");

  const rootOgApi = readFileSync(join(monorepoRoot, "api/og.js"), "utf8");
  assert(rootOgApi.includes("buildHomeStructuredDataJsonLd"), "root api/og.js: home JSON-LD wired");

  const middleware = readFileSync(join(root, "middleware.js"), "utf8");
  assert(middleware.includes("buildHomeStructuredDataJsonLd"), "middleware.js (souq): home JSON-LD for discovery crawlers");

  const rootMiddleware = readFileSync(join(monorepoRoot, "middleware.js"), "utf8");
  assert(rootMiddleware.includes("buildHomeStructuredDataJsonLd"), "middleware.js (root): home JSON-LD wired");

  const foundationTs = readFileSync(join(root, "src/lib/structured-data-foundation.ts"), "utf8");
  const homeJson = buildHomeStructuredDataJsonLd();
  assert(foundationTs.includes("buildHomeStructuredDataJsonLd"), "structured-data-foundation.ts: builder export");
  assert(homeJson.includes('"@type":"Organization"'), "home-structured-data.mjs: Organization node");
  assert(homeJson.includes('"@type":"WebSite"'), "home-structured-data.mjs: WebSite node");
  assert(homeJson.includes('"@type":"WebApplication"'), "home-structured-data.mjs: WebApplication node");

  const indexHtml = readFileSync(join(root, "index.html"), "utf8");
  assert(indexHtml.includes(`id="${P3_STRUCTURED_DATA_SCRIPT_ID}"`), "index.html: P3 JSON-LD script id");

  return errors;
}

/**
 * @param {{ fetchFn?: typeof fetch }} opts
 */
export async function runP13DiscoverabilityProdChecks({ fetchFn = fetch } = {}) {
  const errors = [];
  const assert = createAssert(errors);

  {
    const res = await fetchFn(`${P13_ORIGIN}/llms.txt`);
    const text = await res.text();
    assert(res.ok, `llms.txt: HTTP ${res.status}`);
    assert(text.includes("Souq Arab EU"), "llms.txt prod: brand name");
    assert(text.includes(P13_ORIGIN), "llms.txt prod: canonical origin");
  }

  {
    const res = await fetchFn(`${P13_ORIGIN}/robots.txt`);
    const text = await res.text();
    assert(res.ok, `robots.txt: HTTP ${res.status}`);
    assert(text.includes("User-agent: GPTBot"), "robots.txt prod: GPTBot");
    assert(text.includes("User-agent: Bingbot"), "robots.txt prod: Bingbot");
    assert(text.includes("llms.txt"), "robots.txt prod: llms.txt reference");
  }

  {
    const res = await fetchFn(`${P13_ORIGIN}/`);
    const text = await res.text();
    assert(res.ok, `homepage: HTTP ${res.status}`);
    assert(hasJsonLdType(text, "Organization"), "homepage prod: Organization JSON-LD");
    assert(hasJsonLdType(text, "WebSite"), "homepage prod: WebSite JSON-LD");
    assert(hasJsonLdType(text, "WebApplication"), "homepage prod: WebApplication JSON-LD");
  }

  const adId = await resolveSampleAdId(fetchFn);
  assert(adId, "ads API: sample ad for discovery crawler tests");

  if (adId) {
    for (const [label, ua] of [
      ["Bingbot", BINGBOT_UA],
      ["GPTBot", GPTBOT_UA],
    ]) {
      const res = await fetchFn(`${P13_ORIGIN}/ad/${adId}`, {
        headers: { "User-Agent": ua },
      });
      const text = await res.text();
      assert(res.ok, `${label} /ad/${adId}: HTTP ${res.status}`);
      assert(hasJsonLdType(text, "Product"), `${label} ad page: Product JSON-LD`);
    }

    for (const [label, ua] of [
      ["Bingbot home", BINGBOT_UA],
      ["GPTBot home", GPTBOT_UA],
    ]) {
      const res = await fetchFn(`${P13_ORIGIN}/`, {
        headers: { "User-Agent": ua },
      });
      const text = await res.text();
      assert(res.ok, `${label}: HTTP ${res.status}`);
      assert(hasJsonLdType(text, "Organization"), `${label}: Organization JSON-LD in prerender`);
      assert(hasJsonLdType(text, "WebSite"), `${label}: WebSite JSON-LD in prerender`);
    }
  }

  return errors;
}

/**
 * Bing-focused production checks (parallel to gsc:p13:prod).
 * @param {{ fetchFn?: typeof fetch }} opts
 */
export async function runP13BingProdChecks({ fetchFn = fetch } = {}) {
  const errors = [];
  const assert = createAssert(errors);

  const adId = await resolveSampleAdId(fetchFn);
  assert(adId, "ads API: sample ad for Bingbot test");

  if (adId) {
    const res = await fetchFn(`${P13_ORIGIN}/ad/${adId}`, {
      headers: { "User-Agent": BINGBOT_UA },
    });
    const text = await res.text();
    assert(res.ok, `Bingbot /ad/${adId}: HTTP ${res.status}`);
    assert(hasJsonLdType(text, "Product"), "Bingbot ad page: Product JSON-LD");
    assert(text.includes("application/ld+json"), "Bingbot ad page: ld+json script");
  }

  {
    const res = await fetchFn(`${P13_ORIGIN}/`, {
      headers: { "User-Agent": BINGBOT_UA },
    });
    const text = await res.text();
    assert(res.ok, "Bingbot homepage: HTTP 200");
    assert(hasJsonLdType(text, "Organization"), "Bingbot homepage: Organization JSON-LD");
  }

  return errors;
}

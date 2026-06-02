/**
 * P7-PR-10 — dist/index.html must expose LCP image in initial HTML (not JS-only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlHasFeaturedLeadRenderUrl } from "./ad-image-lcp-constants.mjs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../dist/index.html");

const errors = [];

if (!fs.existsSync(indexPath)) {
  console.error("validate-p7-pr-10: dist/index.html missing — run build first");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");

if (!html.includes('id="p7-lcp-hero-preload"')) {
  errors.push("Missing <link rel=preload id=p7-lcp-hero-preload> in index.html");
}
if (!html.includes('data-testid="home-lcp-prerender"')) {
  errors.push("Missing prerender LCP <img data-testid=home-lcp-prerender>");
}
const hasFeaturedLeadRender = htmlHasFeaturedLeadRenderUrl(html);
if (!hasFeaturedLeadRender) {
  errors.push("Prerender img must use Supabase featured-lead render URL");
}
if (!html.includes('rel="preload" as="image"')) {
  errors.push("Missing image preload in head");
}
if (!html.includes('href="https://api.souq-arab.com"')) {
  errors.push("Missing preconnect to api.souq-arab.com");
}
if (!html.includes('id="p7-home-shell"')) {
  errors.push("Missing #p7-home-shell static markup");
}

const report = { indexPath, pass: errors.length === 0, errors };
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

/**
 * P7-PR-12 — dist/index.html must expose LCP layer outside #root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../dist/index.html");

const errors = [];

if (!fs.existsSync(indexPath)) {
  console.error("validate-p7-pr-12: dist/index.html missing — run build first");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");

if (!html.includes('id="p7-lcp-layer"')) {
  errors.push("Missing #p7-lcp-layer outside #root");
}
if (html.includes('<div id="root">') && html.match(/<div id="root">[\s\S]*?p7-lcp-candidate/)) {
  errors.push("LCP candidate must not live inside #root (React would replace it)");
}
if (!html.includes('id="p7-lcp-hero-preload"')) {
  errors.push("Missing <link rel=preload id=p7-lcp-hero-preload>");
}
if (!html.includes('data-testid="home-lcp-prerender"')) {
  errors.push("Missing prerender LCP img");
}
const hasHeroRender =
  html.includes("/render/image/public/") &&
  (html.includes("width=820&height=615") || html.includes("width=820&amp;height=615"));
if (!hasHeroRender) {
  errors.push("Prerender img must use Supabase hero render URL");
}
if (!html.includes('id="p7-lcp-candidate"')) {
  errors.push("Missing #p7-lcp-candidate");
}
if (/<div id="root">[\s\S]*?<\/div>\s*<\/body>/.test(html)) {
  const rootInner = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)?.[1]?.trim() ?? "";
  if (rootInner.length > 0) {
    errors.push("#root must stay empty for React mount");
  }
}

const report = { indexPath, pass: errors.length === 0, errors };
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

/**
 * P7-PR-14 — dist/index.html: lcp-loader entry, no modulepreload on cold path.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "../dist/index.html");
const errors = [];

if (!fs.existsSync(indexPath)) {
  console.error("validate-p7-pr-14: dist/index.html missing — run build first");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");

if (!html.includes('id="p7-lcp-layer"')) {
  errors.push("Missing #p7-lcp-layer");
}
const edgeOnlyShell =
  process.env.HOME_LCP_SHELL_SKIP === "1" ||
  process.env.VERCEL === "1" ||
  process.env.P7_EDGE_SHELL_ONLY === "1";
if (!edgeOnlyShell && !html.includes('id="p7-lcp-candidate"')) {
  errors.push("Missing #p7-lcp-candidate");
}
if (html.includes('src="/src/main.tsx"') || /src="\/assets\/main-[^"]+\.js"/.test(html)) {
  errors.push("index.html must not load main bundle as sync entry — use lcp-loader phase");
}
if (!/<script type="module"[^>]*src="\/assets\/index-[^"]+\.js"/.test(html)) {
  errors.push("index.html must load hashed index-* entry (lcp-loader)");
}
if (/<link rel="modulepreload"/i.test(html)) {
  errors.push("modulepreload must be stripped from dist index.html (P7-PR-14)");
}
if (!html.includes("p7-await-handoff")) {
  errors.push("Missing p7-await-handoff CSS guard");
}

const report = { indexPath, pass: errors.length === 0, errors };
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

/**
 * P7-PR-10 — Static Language Gate shell must be discoverable in initial HTML (zero-React LCP).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  LANGUAGE_GATE_COPY,
  P7_LANGUAGE_GATE_MARKER,
} from "./language-gate-shell.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, msg) {
  if (!cond) errors.push(msg);
}

const indexHtml = read("index.html");
const distIndex = path.join(root, "dist/index.html");
const lcpLoader = read("src/lcp-loader.ts");
const appTsx = read("src/App.tsx");
const gateShellTs = read("src/lib/language-gate-shell.ts");

must(indexHtml.includes(P7_LANGUAGE_GATE_MARKER), "index.html missing P7-PR-10:LANGUAGE_GATE marker");
must(indexHtml.includes('id="p7-language-gate-shell"'), "index.html missing #p7-language-gate-shell");
must(indexHtml.includes('id="p7-language-gate-lcp"'), "index.html missing LCP h1 #p7-language-gate-lcp");
must(indexHtml.includes(LANGUAGE_GATE_COPY.title), "index.html gate title must match gate/ar.json SSOT");
must(indexHtml.includes("p7-locale-saved"), "index.html bootstrap must dispatch p7-locale-saved before React boot");
must(indexHtml.includes("#p7-language-gate-shell"), "index.html must inline language gate critical CSS");

must(
  lcpLoader.includes("markHomeColdStartReady()") &&
    lcpLoader.includes('document.addEventListener("p7-locale-saved"'),
  "lcp-loader first launch must defer main until p7-locale-saved",
);

must(appTsx.includes("dismissStaticLanguageGate"), "App.tsx must dismiss static gate on React handoff");
must(gateShellTs.includes("export function dismissStaticLanguageGate"), "language-gate-shell.ts helper missing");

const vercelJson = read("vercel.json");
const inlineScriptRe =
  /<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
const distHtmlForCsp = fs.existsSync(distIndex) ? fs.readFileSync(distIndex, "utf8") : indexHtml;
const requiredHashes = [];
let scriptMatch;
while ((scriptMatch = inlineScriptRe.exec(distHtmlForCsp))) {
  const normalized = scriptMatch[1].replace(/\r\n/g, "\n");
  const hash = crypto.createHash("sha256").update(normalized, "utf8").digest("base64");
  requiredHashes.push(`sha256-${hash}`);
}
for (const hash of requiredHashes) {
  must(vercelJson.includes(`'${hash}'`), `vercel.json CSP missing inline script hash ${hash}`);
}
must(
  vercelJson.includes("sha256-+AZVIgC/01obJBI+s3Q6AW6MfKoGHF/QHrf2w1x+2kY="),
  "vercel.json must allow language gate bootstrap inline script hash",
);

if (!fs.existsSync(distIndex)) {
  errors.push("dist/index.html missing — run pnpm build first");
} else {
  const distHtml = fs.readFileSync(distIndex, "utf8");
  must(distHtml.includes('id="p7-language-gate-shell"'), "dist/index.html missing static language gate shell");
  must(distHtml.includes('id="p7-language-gate-lcp"'), "dist/index.html missing LCP candidate h1");
  const rootIdx = distHtml.indexOf('<div id="root"');
  const gateIdx = distHtml.indexOf('id="p7-language-gate-shell"');
  must(gateIdx > 0 && (rootIdx < 0 || gateIdx < rootIdx), "language gate shell must precede #root in HTML");
}

const report = { pass: errors.length === 0, errors };
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

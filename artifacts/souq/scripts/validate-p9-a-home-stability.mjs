/**
 * P9-A — Home Stability Lock regression guards (static source + optional dist).
 * Enforces P09-home-stability-contract.md — no runtime behavior change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const souqRoot = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function read(rel) {
  const abs = path.join(souqRoot, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing file: ${rel}`);
    return "";
  }
  return fs.readFileSync(abs, "utf8");
}

function scanNoMatch(label, content, pattern, message) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "g");
  if (re.test(content)) {
    errors.push(`${label}: ${message}`);
  }
}

function scanMustMatch(label, content, pattern, message) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  if (!re.test(content)) {
    errors.push(`${label}: ${message}`);
  }
}

// --- Source guards ---

const handoff = read("src/lib/home-lcp-handoff.ts");
scanMustMatch(
  "home-lcp-handoff",
  handoff,
  /export function handoffShellLcpToReact[\s\S]*?return false;/,
  "handoffShellLcpToReact must remain deprecated no-op (return false)",
);
scanMustMatch(
  "home-lcp-handoff",
  handoff,
  /export function beginHomeLcpHandoffAwait\(\): void \{\s*\/\* no-op \*\//,
  "beginHomeLcpHandoffAwait must remain no-op",
);

const srcDir = path.join(souqRoot, "src");
function walkTs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walkTs(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

for (const file of walkTs(srcDir)) {
  const rel = path.relative(souqRoot, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  if (rel === "src/lib/home-lcp-handoff.ts") continue;

  if (/handoffShellLcpToReact\s*\(/.test(content)) {
    errors.push(`${rel}: active handoffShellLcpToReact call forbidden (DOM handoff)`);
  }
  if (/beginHomeLcpHandoffAwait\s*\(/.test(content)) {
    errors.push(`${rel}: beginHomeLcpHandoffAwait call forbidden`);
  }
  if (/react-lcp-slot/.test(content) && rel.endsWith(".tsx")) {
    errors.push(`${rel}: react-lcp-slot forbidden in render path`);
  }
  if (/classList\.add\s*\(\s*["']p7-await-handoff["']/.test(content)) {
    errors.push(`${rel}: p7-await-handoff class must never be added at runtime`);
  }
  if (/HOME_FEATURED_INITIAL/.test(content)) {
    errors.push(`${rel}: HOME_FEATURED_INITIAL forbidden`);
  }
}

const homeTsx = read("src/pages/home.tsx");
scanMustMatch(
  "home.tsx",
  homeTsx,
  /buildHomeRecommendedFeed/,
  "must use buildHomeRecommendedFeed for Recommended dedupe",
);
scanMustMatch("home.tsx", homeTsx, /dismissHomeLcpLayer/, "must call dismissHomeLcpLayer (safety)");

const homeFeedSections = read("src/pages/home-feed-sections.tsx");
scanMustMatch("home-feed-sections.tsx", homeFeedSections, /lcpHandoffPending/, "P9-E-3: LCP supersession guard during handoff");
scanNoMatch(
  "home-feed-sections.tsx",
  homeFeedSections,
  /HOME_FEATURED_INITIAL|featuredLeadOnly|initialFeatured\s*=\s*1/,
  "partial featured initial gate forbidden",
);

const lcpLoader = read("src/lcp-loader.ts");
scanMustMatch("lcp-loader.ts", lcpLoader, /waitForHomeShellLcp/, "must await shell LCP before main import");
scanNoMatch(
  "lcp-loader.ts",
  lcpLoader,
  /dismissHomeLcpLayer\(\)/,
  "P9-E-3: shell dismiss only from home.tsx handoff — not boot path",
);
scanMustMatch("lcp-loader.ts", lcpLoader, /isHomePathname/, "must guard with isHomePathname");

const middleware = read("middleware.js");
scanMustMatch(
  "middleware.js",
  middleware,
  /url\.pathname === "\/"/,
  "Edge shell must be gated to exact pathname === '/'",
);

const indexHtml = read("index.html");
scanMustMatch(
  "index.html",
  indexHtml,
  /p !== "\/"/,
  "inline script must strip shell on non-Home paths",
);
scanMustMatch(indexHtml, indexHtml, /id="p7-lcp-layer"/, "shell layer placeholder required");

const p7HomePath = read("src/lib/p7-home-path.ts");
scanMustMatch(
  "p7-home-path.ts",
  p7HomePath,
  /stripped === "\/" \|\| stripped === ""/,
  "isHomePathname must match exact root only",
);

// --- Optional dist checks (when dist exists) ---
const distIndex = path.join(souqRoot, "dist/index.html");
if (fs.existsSync(distIndex)) {
  const html = fs.readFileSync(distIndex, "utf8");
  if (html.match(/<div id="root">[\s\S]*?p7-lcp-candidate/)) {
    errors.push("dist: p7-lcp-candidate must not be inside #root");
  }
}

const report = {
  phase: "P9-A",
  contract: "docs/architecture/P09-home-stability-contract.md",
  pass: errors.length === 0,
  errors,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

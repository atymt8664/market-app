/**
 * P9-B — Extended Home regression guards (static source + dist).
 * Builds on validate-p9-a-home-stability.mjs — no runtime behavior change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const souqRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(souqRoot, "../..");
const errors = [];

function read(rel) {
  const abs = path.join(souqRoot, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing file: ${rel}`);
    return "";
  }
  return fs.readFileSync(abs, "utf8");
}

function mustMatch(label, content, pattern, message) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  if (!re.test(content)) errors.push(`${label}: ${message}`);
}

function mustNotMatch(label, content, pattern, message) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "m");
  if (re.test(content)) errors.push(`${label}: ${message}`);
}

function docExists(rel) {
  if (!fs.existsSync(path.join(repoRoot, rel))) {
    errors.push(`Missing Phase B doc: ${rel}`);
  }
}

// --- Phase B required docs ---
docExists("docs/architecture/P09-B-home-observability.md");
docExists("docs/architecture/P09-B-home-monitoring-baseline.md");
docExists("docs/runbooks/P9-B-home-regression-guard-system.md");
docExists("docs/runbooks/P9-B-ci-validation-strategy.md");

// --- B11: Featured renders all items ---
const feedSections = read("src/pages/home-feed-sections.tsx");
mustMatch(
  "home-feed-sections.tsx",
  feedSections,
  /featuredList\.map\s*\(/,
  "featured strip must map all featuredList items",
);
mustNotMatch(
  "home-feed-sections.tsx",
  feedSections,
  /featuredList\.slice\s*\(/,
  "featured strip must not slice featuredList (partial featured forbidden)",
);
mustMatch(
  "home-feed-sections.tsx",
  feedSections,
  /Recommended grid only — featured strip renders all items immediately/,
  "stability comment must remain on featured policy",
);

// --- B12: No progressive reveal on featured ---
mustNotMatch(
  "home-feed-sections.tsx",
  feedSections,
  /useProgressiveReveal\s*\(\s*featured/,
  "useProgressiveReveal must not apply to featured ads",
);

// --- B13: SW network-only HTML ---
const sw = read("public/sw.js");
mustMatch("sw.js", sw, /isHtmlNavigation\(req\)/, "SW must detect HTML navigation");
mustMatch(
  "sw.js",
  sw,
  /isHtmlNavigation\(req\)[\s\S]*?event\.respondWith\(fetch\(req\)\)/,
  "SW must network-fetch HTML navigations (no stale shell cache)",
);

// --- B14: lcp-loader entry ---
const indexHtml = read("index.html");
mustMatch(indexHtml, indexHtml, /src="\/src\/lcp-loader\.ts"/, "index.html must load lcp-loader entry");
mustNotMatch(
  "index.html",
  indexHtml,
  /src="\/src\/main\.tsx"/,
  "index.html must not sync-load main.tsx",
);

// --- B15: strip shell on non-Home boot ---
const lcpLoader = read("src/lcp-loader.ts");
mustMatch(
  "lcp-loader.ts",
  lcpLoader,
  /stripHomeLcpShellIfNotHome\s*\(\s*\)/,
  "must strip shell when not on Home at boot",
);
mustMatch(
  "lcp-loader.ts",
  lcpLoader,
  /waitForHomeShellLcp/,
  "must use shared waitForHomeShellLcp from home-lcp-handoff (P9-C)",
);

if (fs.existsSync(path.join(souqRoot, "src/lib/deferred-app-bootstrap.ts"))) {
  errors.push("deferred-app-bootstrap.ts removed in P9-C — must not reintroduce duplicate boot path");
}

// --- B16: Lazy Home route ---
const appTsx = read("src/App.tsx");
mustMatch(
  "App.tsx",
  appTsx,
  /lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*"@\/pages\/home"\s*\)/,
  "Home must remain lazy-loaded off entry bundle",
);

// --- B17: No idleExpand=false flicker regression on Home feed ---
mustNotMatch(
  "home-feed-sections.tsx",
  feedSections,
  /idleExpand\s*:\s*false/,
  "idleExpand:false on Home feed forbidden (flicker regression)",
);

// --- B18: Vitals route normalization ---
const vitalsReporting = read("src/lib/web-vitals-reporting.ts");
mustMatch(
  "web-vitals-reporting.ts",
  vitalsReporting,
  /normalizeVitalsRoute/,
  "vitals must use normalizeVitalsRoute for low-cardinality routes",
);
mustNotMatch(
  "web-vitals-reporting.ts",
  vitalsReporting,
  /\buserId\b|\bemail\b/,
  "vitals payload must not include PII fields",
);

// --- B19: SW registration deferred ---
const swRegister = read("src/lib/register-production-service-worker.ts");
mustMatch(
  "register-production-service-worker.ts",
  swRegister,
  /scheduleAfterFirstPaint/,
  "SW registration must defer until after first paint",
);

// --- Middleware: shell only exact / in serveEdgeHomeShell path ---
const middleware = read("middleware.js");
mustMatch(
  "middleware.js",
  middleware,
  /url\.pathname === "\/"[\s\S]*serveEdgeHomeShell/,
  "serveEdgeHomeShell must be gated to pathname === '/'",
);

// --- Run Phase A guards (includes dist checks when present) ---
const phaseA = spawnSync(process.execPath, ["scripts/validate-p9-a-home-stability.mjs"], {
  cwd: souqRoot,
  encoding: "utf8",
});
if (phaseA.status !== 0) {
  errors.push("p9-a:validate failed (embedded in p9-b)");
  try {
    const parsed = JSON.parse(phaseA.stdout || "{}");
    if (Array.isArray(parsed.errors)) {
      for (const e of parsed.errors) errors.push(`p9-a: ${e}`);
    }
  } catch {
    if (phaseA.stdout) errors.push(phaseA.stdout.trim());
  }
}

const report = {
  phase: "P9-B",
  contract: "docs/architecture/P09-home-stability-contract.md",
  guards: "B11-B20 + embedded P9-A",
  pass: errors.length === 0,
  errors,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);

#!/usr/bin/env node
/**
 * P9-IOS-A2HS-REAL-DEVICE — static guard: sticky/fixed top headers must use safe-area SSOT.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");
const INDEX = path.join(__dirname, "..", "index.html");
const STANDALONE = path.join(SRC, "lib", "standalone-safe-area.ts");

const SAFE_MARKERS = [
  "PLATFORM_HEADER_SAFE_TOP_CLASS",
  "TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS",
  "HOME_FIXED_HEADER_SAFE_TOP_CLASS",
  "TAB_PAGE_HEADER_BAR",
  "PLATFORM_L1_HEADER_BAR",
  "SETTINGS_HEADER_BAR",
  "AUTH_HEADER",
  "CHAT_THREAD_HEADER_BAR",
  "inboxCollectionHeaderClass",
  "CREATE_AD_HEADER_BAR",
  "ORDERS_HEADER_BAR",
  "platformHeaderDomProps",
  "platformTopActionsDomProps",
  "data-platform-header",
  "data-platform-top-actions",
  "data-p7-home-header",
  "searchStickyHeaderClass",
];

const EXEMPT_FILES = new Set([
  "push-foreground-banner.tsx",
  "toast.tsx",
  "admin-scrollable-table.tsx",
  "message-thread.tsx",
]);

const EXEMPT_DIRS = ["/features/admin/", "/features/p17-commerce-mock/"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(full);
  }
  return out;
}

function isExempt(file) {
  const rel = file.replace(/\\/g, "/");
  if (EXEMPT_FILES.has(path.basename(file))) return true;
  return EXEMPT_DIRS.some((d) => rel.includes(d));
}

function lineHasTopChrome(line) {
  return (
    /<header\b/i.test(line) &&
    (/sticky\s+top-0|fixed\s+top-0|fixed\s+inset-x-0\s+top-0/.test(line) ||
      /className=\{[^}]*(HEADER|header)/i.test(line))
  );
}

function contextHasSafeArea(lines, idx) {
  const windowText = lines.slice(Math.max(0, idx - 8), Math.min(lines.length, idx + 12)).join("\n");
  return SAFE_MARKERS.some((m) => windowText.includes(m));
}

const violations = [];
for (const file of walk(SRC)) {
  if (isExempt(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!lineHasTopChrome(line)) return;
    if (contextHasSafeArea(lines, i)) return;
    violations.push({ file: path.relative(SRC, file), line: i + 1, text: line.trim() });
  });
}

const indexHtml = readFileSync(INDEX, "utf8");
const standaloneSrc = readFileSync(STANDALONE, "utf8");

const infra = {
  iosA2hsCriticalCss: indexHtml.includes("html.ios-a2hs header"),
  iosA2hsClass: indexHtml.includes('classList.toggle("ios-a2hs"'),
  iosA2hsGate: standaloneSrc.includes("isIosA2hsStandalone"),
  noTwaFallbackGate:
    standaloneSrc.includes("isIosA2hsStandalone()") &&
    standaloneSrc.includes("nav.standalone === true"),
  delayedResync: standaloneSrc.includes("IOS_A2HS_RESYNC_DELAYS_MS"),
  dynamicIslandHeuristic: indexHtml.includes("return 59"),
};

const pass = violations.length === 0 && Object.values(infra).every(Boolean);

console.log(
  JSON.stringify(
    {
      pass,
      violations,
      infra,
      note: "Exempt: admin, toast, push banner, in-thread banners.",
    },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);

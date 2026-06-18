#!/usr/bin/env node
/**
 * P9-IOS-A2HS-REAL-DEVICE — inventory of platform header safe-area coverage.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

const SSOT_SOURCES = [
  { id: "PLATFORM_L1_HEADER_BAR", file: "src/lib/tab-page-header-styles.ts", label: "App Shell L1 tabs" },
  { id: "TAB_PAGE_HEADER_BAR", file: "src/lib/tab-page-header-styles.ts", label: "L2 scroll headers" },
  { id: "AUTH_HEADER", file: "src/lib/auth-page-styles.ts", label: "Auth pages" },
  { id: "SETTINGS_HEADER_BAR", file: "src/components/settings-shell.tsx", label: "Settings/legal" },
  { id: "HOME_FIXED_HEADER_SAFE_TOP_CLASS", file: "src/lib/standalone-safe-area.ts", label: "Home L1" },
  { id: "CHAT_THREAD_HEADER_BAR", file: "src/lib/chat-thread-header-styles.ts", label: "Chat thread" },
  { id: "inboxCollectionHeaderClass", file: "src/lib/chat-inbox-collection-styles.ts", label: "Inbox collections" },
  { id: "PLATFORM_HEADER_SAFE_TOP_CLASS", file: "src/lib/platform-header-safe-area.ts", label: "SSOT module" },
  { id: "html.ios-a2hs header", file: "index.html", label: "Critical CSS frame-0" },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

const consumers = [];
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  const hits = [];
  if (text.includes("PLATFORM_L1_HEADER_BAR")) hits.push("L1-tab");
  if (text.includes("TAB_PAGE_HEADER_BAR") || text.includes("SETTINGS_HEADER_BAR") || text.includes("AUTH_HEADER"))
    hits.push("L2-header-bar");
  if (text.includes("HOME_FIXED_HEADER_SAFE_TOP_CLASS") || text.includes("data-p7-home-header")) hits.push("home");
  if (text.includes("CHAT_THREAD_HEADER_BAR") || text.includes("data-chat-thread-header")) hits.push("chat-thread");
  if (text.includes("platformHeaderDomProps")) hits.push("marker-header");
  if (text.includes("platformTopActionsDomProps")) hits.push("marker-top-actions");
  if (text.includes("AccountHeader") || text.includes("LegalDocumentHeader")) hits.push("settings-component");
  if (hits.length) consumers.push({ file: rel, hits: [...new Set(hits)] });
}

const ssot = SSOT_SOURCES.map((s) => {
  const full = path.join(ROOT, s.file);
  let present = false;
  try {
    present = readFileSync(full, "utf8").includes(s.id);
  } catch {
    present = false;
  }
  return { ...s, present };
});

console.log(JSON.stringify({ ssot, consumerCount: consumers.length, consumers }, null, 2));

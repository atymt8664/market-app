#!/usr/bin/env node
/** P9-IOS-A2HS-BOTTOM-NAV — guards: L4 trim on visible chrome panel (not shell translate). */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bottomNav = readFileSync(path.join(root, "src/lib/bottom-nav-layout.ts"), "utf8");
const standalone = readFileSync(path.join(root, "src/lib/standalone-safe-area.ts"), "utf8");
const indexHtml = readFileSync(path.join(root, "index.html"), "utf8");
const layout = readFileSync(path.join(root, "src/components/layout.tsx"), "utf8");

const checks = [
  {
    name: "L4 trim SSOT on chrome panel marker",
    pass:
      bottomNav.includes("BOTTOM_NAV_IOS_A2HS_L4_TRIM_PX = 14") &&
      bottomNav.includes("data-bottom-nav-chrome") &&
      bottomNav.includes("bottomNavChromeDomProps"),
  },
  {
    name: "visible chrome panel marked in BottomNav component",
    pass: layout.includes("bottomNavChromeDomProps()"),
  },
  {
    name: "shell has no translate drop (retired path)",
    pass:
      !bottomNav.includes("[transform:translate3d") &&
      bottomNav.includes('fixed inset-x-0 bottom-0'),
  },
  {
    name: "frame-0 ios-a2hs L4 critical CSS on chrome panel",
    pass: indexHtml.includes('html.ios-a2hs [data-bottom-nav-chrome="1"]'),
  },
  {
    name: "L4 critical CSS uses env trim not translate drop var",
    pass:
      indexHtml.includes("env(safe-area-inset-bottom,0px) - 14px") &&
      !indexHtml.includes('setProperty("--souq-bottom-nav-drop", "16px")'),
  },
  {
    name: "iOS A2HS gate in index.html (not display-mode alone for L4)",
    pass:
      indexHtml.includes("isIosA2hsStandalone()") &&
      indexHtml.includes('classList.toggle("ios-a2hs"'),
  },
  {
    name: "standalone-safe-area clears JS L4/drop on iOS A2HS only",
    pass:
      standalone.includes("syncIosA2hsBottomNavL4Vars") &&
      standalone.includes("removeProperty(\"--souq-bottom-nav-drop\")") &&
      standalone.includes("isIosA2hsStandalone()"),
  },
  {
    name: "Android/TWA default shell drop remains 0",
    pass: bottomNav.includes("BOTTOM_NAV_VISUAL_DROP_PX = 0"),
  },
  {
    name: "safe-top path untouched",
    pass: standalone.includes("measureIosA2hsSafeTopFallback"),
  },
  {
    name: "L4 padding still owned by chrome panel class",
    pass: bottomNav.includes("BOTTOM_NAV_CHROME_PANEL_CLASS") && bottomNav.includes("souq-safe-bottom"),
  },
];

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) failed++;
}
process.exit(failed ? 1 : 0);

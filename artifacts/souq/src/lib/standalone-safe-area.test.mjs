/**
 * P9-IOS-A2HS-REAL-DEVICE — standalone-safe-area + platform header unit checks.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");
const tabHeaderSrc = readFileSync(path.join(__dirname, "tab-page-header-styles.ts"), "utf8");
const platformSrc = readFileSync(path.join(__dirname, "platform-header-safe-area.ts"), "utf8");
const standaloneSrc = readFileSync(path.join(__dirname, "standalone-safe-area.ts"), "utf8");
const appChromeSrc = readFileSync(path.join(ROOT, "src", "components", "app-chrome-header.tsx"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(indexHtml.includes("html.ios-a2hs header"), "index.html ios-a2hs critical CSS for all headers");
assert(indexHtml.includes('classList.toggle("ios-a2hs"'), "index.html ios-a2hs document class");
assert(indexHtml.includes("return 59"), "Dynamic Island fallback heuristic");

assert(platformSrc.includes("PLATFORM_HEADER_SAFE_TOP_CLASS"), "platform SSOT class");
assert(platformSrc.includes("platformHeaderDomProps"), "platform header marker helper");

assert(tabHeaderSrc.includes("PLATFORM_L1_HEADER_BAR"), "L1 header bar SSOT");
assert(/PLATFORM_L1_HEADER_BAR[\s\S]*TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS/.test(tabHeaderSrc), "L1 safe-top");

assert(standaloneSrc.includes("IOS_A2HS_RESYNC_DELAYS_MS"), "delayed resync on real device");
assert(standaloneSrc.includes("IOS_A2HS_DOCUMENT_CLASS"), "ios-a2hs document class sync");
assert(
  standaloneSrc.includes("isIosA2hsStandalone()") && standaloneSrc.includes("nav.standalone === true"),
  "iOS A2HS gate uses navigator.standalone",
);
assert(
  standaloneSrc.includes("isStandaloneDisplayMode()") &&
    /resolvedTop <= 0 && isIosA2hsStandalone\(\)/.test(standaloneSrc),
  "fallback gated to iOS A2HS only",
);

assert(appChromeSrc.includes("PLATFORM_L1_HEADER_BAR"), "AppChrome uses L1 bar");
assert(appChromeSrc.includes("platformHeaderDomProps"), "AppChrome header marker");

console.log("p9-ios-a2hs-real-device standalone-safe-area: PASS");

#!/usr/bin/env node
/** Bottom Nav polish + Home ads horizontal inset — static contract guards */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bottomNav = readFileSync(join(root, "src/lib/bottom-nav-layout.ts"), "utf8");
const homeLayout = readFileSync(join(root, "src/lib/home-page-layout.ts"), "utf8");
const homeFeed = readFileSync(join(root, "src/pages/home-feed-sections.tsx"), "utf8");
const homeSkeleton = readFileSync(join(root, "src/components/home-feed-skeleton.tsx"), "utf8");
const adCard = readFileSync(join(root, "src/components/ad-card.tsx"), "utf8");

const checks = [
  {
    name: "bottom nav visual drop lifted to 0px (8px up from prior)",
    pass:
      bottomNav.includes("BOTTOM_NAV_VISUAL_DROP_PX = 0") &&
      bottomNav.includes("var(--souq-bottom-nav-drop,0px)"),
  },
  {
    name: "bottom nav safe-bottom padding unchanged",
    pass:
      bottomNav.includes("pb-[var(--souq-safe-bottom,env(safe-area-inset-bottom,0px))]") &&
      bottomNav.includes("BOTTOM_NAV_CHROME_PANEL_CLASS"),
  },
  {
    name: "home feed ads inset defined separately from page inset",
    pass:
      homeLayout.includes("HOME_FEED_ADS_GUTTER") &&
      homeLayout.includes('px-2 md:px-4 lg:px-6') &&
      homeLayout.includes('px-4 md:px-6 lg:px-8'),
  },
  {
    name: "featured strip uses HOME_FEED_ADS_INSET only",
    pass:
      homeFeed.includes("HOME_FEED_ADS_INSET") &&
      /featured_ads[\s\S]*HOME_PAGE_INSET[\s\S]*HOME_FEED_ADS_INSET/.test(homeFeed),
  },
  {
    name: "recommended grid uses HOME_FEED_ADS_INSET; title keeps HOME_PAGE_INSET",
    pass: (() => {
      const rec = homeFeed.indexOf('t("home.recommended")');
      const block = homeFeed.slice(rec - 120, rec + 280);
      return block.includes("HOME_PAGE_INSET") && block.includes("HOME_FEED_ADS_INSET");
    })(),
  },
  {
    name: "home skeleton mirrors tighter ad inset",
    pass: homeSkeleton.includes("HOME_FEED_ADS_INSET"),
  },
  {
    name: "shared AdCard component untouched",
    pass: !adCard.includes("HOME_FEED_ADS_INSET"),
  },
  {
    name: "home feed uses scroll-end clearance (not bare spacer)",
    pass:
      readFileSync(join(root, "src/pages/home-feed-sections.tsx"), "utf8").includes(
        "BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS",
      ) &&
      readFileSync(join(root, "src/components/home-feed-skeleton.tsx"), "utf8").includes(
        "BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS",
      ) &&
      bottomNav.includes("BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS"),
  },
  {
    name: "favorites still uses bare spacer (no home-only regression spread)",
    pass: readFileSync(join(root, "src/pages/favorites.tsx"), "utf8").includes(
      "BOTTOM_NAV_SCROLL_END_SPACER_CLASS",
    ),
  },
];

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) failed++;
}

if (failed) process.exit(1);
console.log(`\nAll ${checks.length} polish checks passed.`);

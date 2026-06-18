#!/usr/bin/env node
/** P9-PROFILE-FIXED-LAYOUT-ADS-INTERNAL-SCROLL — static layout contract guards */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profileSrc = readFileSync(join(root, "src/pages/profile.tsx"), "utf8");
const tabShellSrc = readFileSync(join(root, "src/components/profile-content-tab-shell.tsx"), "utf8");
const userProfileSrc = readFileSync(join(root, "src/pages/user-profile.tsx"), "utf8");

const checks = [
  {
    name: "profile.tsx does not render ProfileMetricsBand",
    pass: !profileSrc.includes("<ProfileMetricsBand"),
  },
  {
    name: "profile.tsx does not import ProfileMetricsBand",
    pass: !/import\s*\{[^}]*ProfileMetricsBand/.test(profileSrc),
  },
  {
    name: "profile.tsx has pinned header test id",
    pass: profileSrc.includes('data-testid="profile-pinned-header"'),
  },
  {
    name: "profile.tsx uses internal tab panel scroll",
    pass: profileSrc.includes("panelScrollable"),
  },
  {
    name: "profile.tsx does not use AppShellContentScroll",
    pass: !profileSrc.includes("AppShellContentScroll"),
  },
  {
    name: "profile.tsx keeps bottom nav clearance spacer",
    pass: profileSrc.includes('data-testid="profile-scroll-spacer"'),
  },
  {
    name: "profile.tsx pins OrdersAccountCardGrid in header zone",
    pass: (() => {
      const pinned = profileSrc.indexOf('data-testid="profile-pinned-header"');
      const tabShell = profileSrc.indexOf("<ProfileContentTabShell");
      const orders = profileSrc.indexOf("OrdersAccountCardGrid", pinned);
      return pinned >= 0 && tabShell > pinned && orders > pinned && orders < tabShell;
    })(),
  },
  {
    name: "profile-content-tab-shell supports panelScrollable",
    pass: tabShellSrc.includes("panelScrollable") && tabShellSrc.includes("profile-content-tab-panel-scroll"),
  },
  {
    name: "user-profile.tsx still uses ProfileMetricsBand (public profile unchanged)",
    pass: userProfileSrc.includes("ProfileMetricsBand"),
  },
  {
    name: "profile.tsx has compact my-ads empty state",
    pass:
      profileSrc.includes('data-testid="profile-my-ads-empty"') &&
      profileSrc.includes("PROFILE_MY_ADS_EMPTY") &&
      !profileSrc.includes('className="py-10 text-center"'),
  },
  {
    name: "profile.tsx uses profile-only compact ad card shell",
    pass:
      profileSrc.includes("PROFILE_MY_ADS_CARD_SHELL") &&
      profileSrc.includes("ProfileMobileAdCard") &&
      profileSrc.includes("ProfileDesktopAdCard"),
  },
  {
    name: "profile.tsx empty my-ads uses fit-content shell (no flex-1 stretch)",
    pass:
      profileSrc.includes("isMyAdsEmpty") &&
      profileSrc.includes('isMyAdsEmpty ? "h-fit shrink-0" : "min-h-0 flex-1"') &&
      profileSrc.includes("panelScrollable={!isMyAdsEmpty}"),
  },
  {
    name: "shared ad-card component untouched by compact polish",
    pass: !readFileSync(join(root, "src/components/ad-card.tsx"), "utf8").includes(
      "PROFILE_MY_ADS_CARD_SHELL",
    ),
  },
];

let failed = 0;
for (const c of checks) {
  const status = c.pass ? "PASS" : "FAIL";
  console.log(`${status}  ${c.name}`);
  if (!c.pass) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} static layout checks passed.`);

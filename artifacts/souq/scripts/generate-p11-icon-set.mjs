/**
 * [P11-1] Generate favicon, PWA, maskable, Android launcher, and Play Store icons
 * from public/brand/logo-master.png (official Logo Master — do not edit source art).
 *
 * Usage: node scripts/generate-p11-icon-set.mjs
 * Requires: npx sharp-cli (no repo dependency; uses child_process).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const brandDir = path.join(publicDir, "brand");
const iconsDir = path.join(publicDir, "icons");
const masterPath = path.join(brandDir, "logo-master.png");
const playKitDir = path.resolve(
  __dirname,
  "../../../google-play-publish-kit/graphics",
);

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ANDROID_LAUNCHER = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

function quoteArg(arg) {
  if (!/[ "'()]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function runSharp(input, output, ...commands) {
  const parts = [
    "npx",
    "--yes",
    "sharp-cli",
    "-i",
    quoteArg(input),
    "-o",
    quoteArg(output),
    ...commands.map(String),
  ];
  const result = spawnSync(parts.join(" "), {
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `sharp-cli failed (${output}): ${result.stderr || result.stdout}`,
    );
  }
  if (!fs.existsSync(output)) {
    throw new Error(`Expected output missing: ${output}`);
  }
}

function ensureDirs() {
  for (const dir of [brandDir, iconsDir, playKitDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const { folder } of ANDROID_LAUNCHER) {
    fs.mkdirSync(path.join(brandDir, "android-launcher", folder), {
      recursive: true,
    });
  }
}

function generatePwaIcons() {
  for (const size of PWA_SIZES) {
    const out = path.join(iconsDir, `pwa-icon-${size}.png`);
    runSharp(masterPath, out, "resize", String(size), String(size));
  }
}

/** Maskable: logo at ~80% inside 512×512 on manifest background (#10131a). */
function generateMaskable512() {
  const inner = 410;
  const tmp = path.join(iconsDir, ".maskable-inner.png");
  const out = path.join(iconsDir, "pwa-maskable-512.png");
  runSharp(masterPath, tmp, "resize", String(inner), String(inner));
  runSharp(
    tmp,
    out,
    "extend",
    "51",
    "51",
    "51",
    "51",
    "--background",
    "#10131a",
  );
  fs.unlinkSync(tmp);
}

function generateFavicons() {
  runSharp(masterPath, path.join(iconsDir, "favicon-16.png"), "resize", "16", "16");
  runSharp(masterPath, path.join(iconsDir, "favicon-32.png"), "resize", "32", "32");
  runSharp(masterPath, path.join(iconsDir, "favicon-48.png"), "resize", "48", "48");
}

function generateAndroidLauncher() {
  for (const { folder, size } of ANDROID_LAUNCHER) {
    const out = path.join(
      brandDir,
      "android-launcher",
      folder,
      "ic_launcher.png",
    );
    runSharp(masterPath, out, "resize", String(size), String(size));
  }
}

function generatePlayStore() {
  const out = path.join(playKitDir, "app-icon-512.png");
  runSharp(masterPath, out, "resize", "512", "512");
  const brandCopy = path.join(brandDir, "play-store-icon-512.png");
  fs.copyFileSync(out, brandCopy);
}

function generatePromoVideoLogo() {
  const out = path.join(publicDir, "promo-video", "logo.png");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  runSharp(masterPath, out, "resize", "512", "512");
}

function writeFaviconSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="Souq Arab EU">
  <image href="/icons/favicon-32.png" width="32" height="32"/>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, "favicon.svg"), svg, "utf8");
}

function main() {
  if (!fs.existsSync(masterPath)) {
    console.error(
      `[P11-1] Missing Logo Master at ${masterPath}. Copy official artwork first.`,
    );
    process.exit(1);
  }
  ensureDirs();
  generatePwaIcons();
  generateMaskable512();
  generateFavicons();
  generateAndroidLauncher();
  generatePlayStore();
  generatePromoVideoLogo();
  writeFaviconSvg();
  const badgeScript = path.join(__dirname, "generate-notification-badge.mjs");
  if (fs.existsSync(badgeScript)) {
    const badgeRun = spawnSync(process.execPath, [badgeScript], {
      stdio: "inherit",
      encoding: "utf8",
    });
    if (badgeRun.status !== 0) {
      throw new Error("generate-notification-badge.mjs failed");
    }
  }
  console.log("[P11] Icon set generated from logo-master.png");
}

main();

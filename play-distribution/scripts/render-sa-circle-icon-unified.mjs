/**
 * Unified SA circle icon generation — PWA, favicon, TWA/Android mipmaps.
 * SSOT: attached_assets/SA-app-icon-circle-v1.png
 *
 * Usage (from play-distribution/): npm run sa-circle-icons
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADAPTIVE_FILL,
  LEGACY_FILL,
  PWA_FILL,
  renderCenterCrop,
  renderComposite,
} from "./sa-circle-icon-core.mjs";
import { pngBufferToIco } from "../../artifacts/souq/scripts/p11-favicon-head-links.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "attached_assets/SA-app-icon-circle-v1.png");
const souqPublic = path.join(repoRoot, "artifacts/souq/public");
const iconsDir = path.join(souqPublic, "icons");
const brandDir = path.join(souqPublic, "brand");
const androidRes = path.join(
  repoRoot,
  "play-distribution/twa/souq-twa-android/app/src/main/res",
);
const playKitDir = path.join(repoRoot, "google-play-publish-kit/graphics");

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const FAVICON_SIZES = [16, 32, 48];

const MIPMAP_LAUNCHER = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

const MIPMAP_ADAPTIVE = [
  { folder: "mipmap-mdpi", size: 108 },
  { folder: "mipmap-hdpi", size: 162 },
  { folder: "mipmap-xhdpi", size: 216 },
  { folder: "mipmap-xxhdpi", size: 324 },
  { folder: "mipmap-xxxhdpi", size: 432 },
];

const NOTIFICATION = [
  { folder: "drawable-mdpi", size: 24 },
  { folder: "drawable-hdpi", size: 36 },
  { folder: "drawable-xhdpi", size: 48 },
  { folder: "drawable-xxhdpi", size: 72 },
  { folder: "drawable-xxxhdpi", size: 96 },
];

function ensureDirs() {
  for (const d of [iconsDir, brandDir, playKitDir]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function writePwaIcons() {
  for (const size of PWA_SIZES) {
    const out = path.join(iconsDir, `pwa-icon-${size}.png`);
    await (await renderComposite(source, size, PWA_FILL)).toFile(out);
  }
  const maskable = path.join(iconsDir, "pwa-maskable-512.png");
  await (await renderComposite(source, 512, ADAPTIVE_FILL)).toFile(maskable);
}

async function writeFavicons() {
  for (const size of FAVICON_SIZES) {
    const out = path.join(iconsDir, `favicon-${size}.png`);
    await (await renderCenterCrop(source, size)).toFile(out);
  }
  const png48 = fs.readFileSync(path.join(iconsDir, "favicon-48.png"));
  fs.writeFileSync(
    path.join(souqPublic, "favicon.ico"),
    pngBufferToIco(png48, 48),
  );
  const png32 = fs.readFileSync(path.join(iconsDir, "favicon-32.png"));
  const b64 = png32.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="Souq Arab EU">
  <image href="data:image/png;base64,${b64}" width="32" height="32"/>
</svg>
`;
  fs.writeFileSync(path.join(souqPublic, "favicon.svg"), svg, "utf8");
}

async function writeBrandCopies() {
  const brandCopy = path.join(brandDir, "SA-app-icon-circle-v1.png");
  fs.copyFileSync(source, brandCopy);
  const play512 = path.join(iconsDir, "pwa-icon-512.png");
  fs.copyFileSync(play512, path.join(brandDir, "play-store-icon-512.png"));
  fs.copyFileSync(play512, path.join(playKitDir, "app-icon-512.png"));
}

async function writeAndroidIcons() {
  for (const { folder, size } of MIPMAP_LAUNCHER) {
    const out = path.join(androidRes, folder, "ic_launcher.png");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await (await renderComposite(source, size, LEGACY_FILL)).toFile(out);
  }
  for (const { folder, size } of MIPMAP_ADAPTIVE) {
    const out = path.join(androidRes, folder, "ic_maskable.png");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await (await renderComposite(source, size, ADAPTIVE_FILL)).toFile(out);
  }
  for (const { folder, size } of NOTIFICATION) {
    const out = path.join(androidRes, folder, "ic_notification_icon.png");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await (await renderCenterCrop(source, size)).toFile(out);
  }
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error(JSON.stringify({ ok: false, error: "missing_source", source }));
    process.exit(1);
  }
  ensureDirs();
  await writePwaIcons();
  await writeFavicons();
  await writeBrandCopies();
  await writeAndroidIcons();
  console.log(
    JSON.stringify(
      {
        ok: true,
        source,
        outputs: {
          pwa: PWA_SIZES.map((s) => `icons/pwa-icon-${s}.png`),
          maskable: "icons/pwa-maskable-512.png",
          android: "souq-twa-android/app/src/main/res/mipmap-*/ic_*",
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

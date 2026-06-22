/**
 * P11 — Generate Android TWA native splash drawables from approved asset.
 * Source SSOT: attached_assets/SA-splash-screen-v1.jpg
 * Targets: res/drawable-mdpi..xxxhdpi/splash.png under souq-twa-android.
 *
 * Canvas uses modern portrait phone aspect (~9:21) per density so TWA splash
 * fills tall screens without letterboxing. Cover crop keeps girl + SA logo + text
 * via attention-based focal point (prefer edge crop over subject crop).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "attached_assets/SA-splash-screen-v1.jpg");
const androidRes = path.join(
  repoRoot,
  "play-distribution/twa/souq-twa-android/app/src/main/res",
);

/** Canonical splash width in dp (common phone short edge). */
const SPLASH_WIDTH_DP = 360;
/**
 * Canonical splash height in dp — 21:9 portrait (tall phones / fold inner / long aspect).
 * Slightly taller than 20:9 so CENTER/CENTER_CROP overscan avoids bottom/top bars.
 */
const SPLASH_HEIGHT_DP = 840;

/** Android density multipliers for drawable-*dpi buckets. */
const DENSITY_MULTIPLIERS = {
  "drawable-mdpi": 1,
  "drawable-hdpi": 1.5,
  "drawable-xhdpi": 2,
  "drawable-xxhdpi": 3,
  "drawable-xxxhdpi": 4,
};

/** Legacy Bubblewrap 2:3 canvas (regression guard). */
const LEGACY_2_3_XXHDPI = { width: 960, height: 1440 };

function buildSplashSizes() {
  const sizes = {};
  for (const [folder, multiplier] of Object.entries(DENSITY_MULTIPLIERS)) {
    sizes[folder] = {
      width: Math.round(SPLASH_WIDTH_DP * multiplier),
      height: Math.round(SPLASH_HEIGHT_DP * multiplier),
    };
  }
  return sizes;
}

const SPLASH_SIZES = buildSplashSizes();

if (!fs.existsSync(source)) {
  console.error(JSON.stringify({ ok: false, error: "missing_source", source }));
  process.exit(1);
}

const meta = await sharp(source).metadata();
const { data: corner } = await sharp(source)
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true });
const edgeColor = `#${[corner[0], corner[1], corner[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

const written = [];
for (const [folder, { width, height }] of Object.entries(SPLASH_SIZES)) {
  const outDir = path.join(androidRes, folder);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "splash.png");

  // Cover fill: no letterboxing inside the PNG. Attention focal point keeps
  // subject (girl + logo + text) over blind centre crop when edges must go.
  await sharp(source)
    .resize(width, height, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .png({ compressionLevel: 9 })
    .toFile(outFile);

  const outMeta = await sharp(outFile).metadata();
  written.push({
    folder,
    outFile,
    width: outMeta.width,
    height: outMeta.height,
    aspect: Number((outMeta.width / outMeta.height).toFixed(4)),
    bytes: fs.statSync(outFile).size,
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      source,
      sourceSize: { width: meta.width, height: meta.height },
      sourceAspect: Number((meta.width / meta.height).toFixed(4)),
      canvasDp: { width: SPLASH_WIDTH_DP, height: SPLASH_HEIGHT_DP },
      edgeColor,
      algorithm: "cover+attention",
      legacyAvoided: LEGACY_2_3_XXHDPI,
      written,
    },
    null,
    2,
  ),
);

/**
 * P11 — Verify approved native splash is packaged in release APK/AAB artifacts.
 * SSOT source: attached_assets/SA-splash-screen-v1.jpg → drawable-xxhdpi/splash.png
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const twaRoot = path.join(repoRoot, "play-distribution/twa/souq-twa-android");
const srcSplash = path.join(
  twaRoot,
  "app/src/main/res/drawable-xxhdpi/splash.png",
);
const packagedGlob = path.join(
  twaRoot,
  "app/build/intermediates/packaged_res/release",
);
const apkPath = path.join(
  twaRoot,
  "app/build/outputs/apk/release/app-release-unsigned.apk",
);
const aabPath = path.join(
  twaRoot,
  "app/build/outputs/bundle/release/app-release.aab",
);

/** Legacy Bubblewrap icon splash at xxhdpi. */
const LEGACY_ICON_XXHDPI = { width: 960, height: 1440 };
/** P11 fullscreen cover canvas at xxhdpi (360×840 dp @ 3x). */
const EXPECTED_FULLSCREEN_XXHDPI = { width: 1080, height: 2520 };

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function pngSize(file) {
  const m = await sharp(file).metadata();
  return { width: m.width, height: m.height };
}

/** Pixel-level hash survives aapt2 PNG crunch (byte hash does not). */
async function pngPixelHash(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return {
    width: info.width,
    height: info.height,
    hash: crypto.createHash("sha256").update(data).digest("hex"),
  };
}

function findPackagedXxhdpiSplash() {
  if (!fs.existsSync(packagedGlob)) return null;
  for (const root of fs.readdirSync(packagedGlob, { withFileTypes: true })) {
    if (!root.isDirectory()) continue;
    const candidate = path.join(
      packagedGlob,
      root.name,
      "drawable-xxhdpi-v4",
      "splash.png",
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function extractAabXxhdpiSplash(aab) {
  const work = fs.mkdtempSync(path.join(tmpdir(), "twa-aab-splash-"));
  const copy = path.join(work, "app.aab");
  fs.copyFileSync(aab, copy);
  execSync(`jar xf "${path.basename(copy)}"`, { cwd: work, stdio: "pipe" });
  const splash = path.join(work, "base", "res", "drawable-xxhdpi-v4", "splash.png");
  if (!fs.existsSync(splash)) {
    fs.rmSync(work, { recursive: true, force: true });
    return null;
  }
  const size = fs.statSync(splash).size;
  const hash = sha256(splash);
  const pixelCopy = path.join(tmpdir(), `twa-aab-splash-${crypto.randomBytes(4).toString("hex")}.png`);
  fs.copyFileSync(splash, pixelCopy);
  fs.rmSync(work, { recursive: true, force: true });
  return { size, hash, path: pixelCopy };
}

const errors = [];
const checks = {};

if (!fs.existsSync(srcSplash)) {
  errors.push("missing_source_splash");
} else {
  const dims = await pngSize(srcSplash);
  checks.source_xxhdpi = dims;
  checks.source_xxhdpi_bytes = fs.statSync(srcSplash).size;
  checks.source_xxhdpi_hash = sha256(srcSplash);

  if (
    dims.width === LEGACY_ICON_XXHDPI.width &&
    dims.height === LEGACY_ICON_XXHDPI.height
  ) {
    errors.push("source_splash_is_legacy_2_3_icon_canvas");
  }
  if (
    dims.width !== EXPECTED_FULLSCREEN_XXHDPI.width ||
    dims.height !== EXPECTED_FULLSCREEN_XXHDPI.height
  ) {
    errors.push("source_splash_not_fullscreen_xxhdpi_canvas");
  }
}

const packaged = findPackagedXxhdpiSplash();
if (!packaged) {
  errors.push("missing_packaged_res_splash_run_gradle_release_first");
} else {
  const dims = await pngSize(packaged);
  checks.packaged_xxhdpi = dims;
  checks.packaged_xxhdpi_bytes = fs.statSync(packaged).size;
  checks.packaged_xxhdpi_hash = sha256(packaged);
  if (checks.source_xxhdpi_hash && checks.packaged_xxhdpi_hash !== checks.source_xxhdpi_hash) {
    errors.push("packaged_splash_hash_mismatch_vs_source");
  }
}

if (!fs.existsSync(apkPath)) {
  errors.push("missing_apk_run_gradle_assembleRelease");
} else {
  checks.apk_path = apkPath;
  checks.apk_bytes = fs.statSync(apkPath).size;
}

if (!fs.existsSync(aabPath)) {
  errors.push("missing_aab_run_gradle_bundleRelease");
} else {
  checks.aab_path = aabPath;
  checks.aab_bytes = fs.statSync(aabPath).size;
  const aabSplash = extractAabXxhdpiSplash(aabPath);
  if (!aabSplash) {
    errors.push("aab_missing_xxhdpi_splash");
  } else {
    checks.aab_xxhdpi_splash_bytes = aabSplash.size;
    checks.aab_xxhdpi_splash_hash = aabSplash.hash;
    const srcPixels = await pngPixelHash(srcSplash);
    const aabPixels = await pngPixelHash(aabSplash.path);
    checks.source_xxhdpi_pixels = srcPixels;
    checks.aab_xxhdpi_splash_pixels = aabPixels;
    if (aabPixels.hash !== srcPixels.hash) {
      errors.push("aab_splash_pixel_hash_mismatch_vs_source");
    }
    if (aabSplash.size < 900_000) {
      errors.push("aab_splash_xxhdpi_too_small_likely_old_icon_splash");
    }
  }
}

const ok = errors.length === 0;
console.log(JSON.stringify({ ok, checks, errors }, null, 2));
process.exit(ok ? 0 : 1);

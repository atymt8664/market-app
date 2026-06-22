/**
 * P11 — Full release artifact validation (splash, launcher, manifest, version, signing, APK vs AAB).
 * Usage (from play-distribution/): npm run validate-p11-release
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  formatSha256Colon,
  loadReleaseSigningConfig,
  normalizeSha256Fingerprint,
  readAssetlinksFingerprints,
  resolveRepoPath,
} from "./release-signing-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const twaRoot = path.join(repoRoot, "play-distribution/twa/souq-twa-android");
const prodManifestPath = path.join(
  repoRoot,
  "artifacts/souq/public/manifest.webmanifest",
);
const unifiedIconSource = path.join(
  repoRoot,
  "attached_assets/SA-app-icon-circle-v1.png",
);
const srcSplash = path.join(
  twaRoot,
  "app/src/main/res/drawable-xxhdpi/splash.png",
);
const srcLauncher = path.join(
  twaRoot,
  "app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
);
const embeddedManifest = path.join(
  twaRoot,
  "app/src/main/res/raw/web_app_manifest.json",
);
const packagedSplash = path.join(
  twaRoot,
  "app/build/intermediates/packaged_res/release/packageReleaseResources/drawable-xxhdpi-v4/splash.png",
);
const packagedLauncher = path.join(
  twaRoot,
  "app/build/intermediates/packaged_res/release/packageReleaseResources/mipmap-xxhdpi-v4/ic_launcher.png",
);
const unsignedApk = path.join(
  twaRoot,
  "app/build/outputs/apk/release/app-release-unsigned.apk",
);
const unsignedAab = path.join(
  twaRoot,
  "app/build/outputs/bundle/release/app-release.aab",
);
const signedApk = path.join(twaRoot, "app-release-signed.apk");
const signedAab = path.join(twaRoot, "app-release-bundle.aab");

function findMohamedTestApk() {
  if (fs.existsSync(signedApk)) return signedApk;
  const backups = fs
    .readdirSync(twaRoot)
    .filter(
      (n) =>
        n.startsWith("app-release-signed.apk.pre-clean-") && n.endsWith(".bak"),
    )
    .map((n) => path.join(twaRoot, n))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return backups[0] ?? null;
}

const mohamedApk = findMohamedTestApk();

const signingConfig = loadReleaseSigningConfig();
const EXPECTED = {
  packageName: signingConfig.packageName,
  versionCode: signingConfig.versionCode,
  versionName: String(signingConfig.versionName),
  backgroundColor: "#020202",
  splashIconSrc: "/icons/pwa-splash-launch-512.png",
  uploadKeySha256: normalizeSha256Fingerprint(
    signingConfig.certificates.uploadKeySha256,
  ),
  appSigningKeySha256: normalizeSha256Fingerprint(
    signingConfig.certificates.appSigningKeySha256,
  ),
  alpha11BaselineVersionCode: 11,
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function pngPixelHash(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return {
    width: info.width,
    height: info.height,
    bytes: fs.statSync(file).size,
    fileHash: sha256(file),
    pixelHash: crypto.createHash("sha256").update(data).digest("hex"),
  };
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const copy = path.join(outDir, "archive.zip");
  fs.copyFileSync(zipPath, copy);
  execSync(`jar xf "${path.basename(copy)}"`, { cwd: outDir, stdio: "pipe" });
}

function extractAabFile(aabPath, relativePath) {
  const work = fs.mkdtempSync(path.join(tmpdir(), "p11-aab-"));
  extractZip(aabPath, work);
  const file = path.join(work, ...relativePath.split("/"));
  if (!fs.existsSync(file)) {
    fs.rmSync(work, { recursive: true, force: true });
    return null;
  }
  const out = path.join(
    tmpdir(),
    `p11-aab-${crypto.randomBytes(4).toString("hex")}-${path.basename(file)}`,
  );
  fs.copyFileSync(file, out);
  fs.rmSync(work, { recursive: true, force: true });
  return { path: out, bytes: fs.statSync(out).size, hash: sha256(out) };
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function parseManifestFields(manifestPath) {
  const j = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const splashIcon = j.icons?.find((i) => i.src?.includes("splash"))?.src ?? null;
  return {
    background_color: j.background_color,
    theme_color: j.theme_color,
    splash_icon: splashIcon,
    has_maskable_512: Boolean(
      j.icons?.some((i) => i.src?.includes("pwa-maskable-512")),
    ),
  };
}

function findAapt2() {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!home) return null;
  const bt = path.join(home, "build-tools");
  if (!fs.existsSync(bt)) return null;
  const versions = fs
    .readdirSync(bt)
    .filter((v) => /^\d/.test(v))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const v of versions) {
    const exe = path.join(bt, v, process.platform === "win32" ? "aapt2.exe" : "aapt2");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

function dumpApkBadging(apkPath) {
  const aapt2 = findAapt2();
  if (!aapt2) return null;
  const out = execSync(`"${aapt2}" dump badging "${apkPath}"`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pkg = out.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
  if (!pkg) return null;
  return {
    packageName: pkg[1],
    versionCode: Number(pkg[2]),
    versionName: pkg[3],
  };
}

function verifyApkSigning(apkPath) {
  const aapt2 = findAapt2();
  if (!aapt2) return { ok: false, error: "missing_aapt2" };
  const btDir = path.dirname(aapt2);
  const apksigner = path.join(btDir, process.platform === "win32" ? "apksigner.bat" : "apksigner");
  if (!fs.existsSync(apksigner)) return { ok: false, error: "missing_apksigner" };
  const out = execSync(`"${apksigner}" verify --print-certs "${apkPath}"`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const m = out.match(/Signer #1 certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)/i);
  if (!m) return { ok: false, error: "no_cert_digest" };
  const digestNorm = normalizeSha256Fingerprint(m[1]);
  const uploadNorm = EXPECTED.uploadKeySha256;
  const appNorm = EXPECTED.appSigningKeySha256;
  return {
    ok: digestNorm === uploadNorm,
    sha256: formatSha256Colon(digestNorm),
    sha256Normalized: digestNorm,
    expectedUploadKey: formatSha256Colon(uploadNorm),
    expectedAppSigningKey: formatSha256Colon(appNorm),
    matchesUploadKey: digestNorm === uploadNorm,
    matchesAppSigningKey: digestNorm === appNorm,
    wrongKeyTypeIfMismatch:
      digestNorm === appNorm
        ? null
        : digestNorm !== uploadNorm
          ? "signed_with_unexpected_key"
          : null,
  };
}

function verifyAabSigning(aabPath) {
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) return { ok: false, error: "missing_java_home" };
  const jarsigner = path.join(
    javaHome,
    "bin",
    process.platform === "win32" ? "jarsigner.exe" : "jarsigner",
  );
  if (!fs.existsSync(jarsigner)) return { ok: false, error: "missing_jarsigner" };
  try {
    execSync(`"${jarsigner}" -verify "${aabPath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, verified: true };
  } catch {
    return { ok: false, error: "jarsigner_verify_failed" };
  }
}

async function main() {
  const errors = [];
  const checks = {};

  checks.unified_icon_source_hash = fs.existsSync(unifiedIconSource)
    ? sha256(unifiedIconSource)
    : null;
  if (!checks.unified_icon_source_hash) errors.push("missing_unified_icon_source");

  if (!fs.existsSync(srcSplash)) {
    errors.push("missing_source_splash");
  } else {
    checks.source_splash = await pngPixelHash(srcSplash);
  }

  if (!fs.existsSync(srcLauncher)) {
    errors.push("missing_source_launcher");
  } else {
    checks.source_launcher = await pngPixelHash(srcLauncher);
  }

  if (!fs.existsSync(prodManifestPath)) {
    errors.push("missing_production_manifest");
  } else {
    checks.production_manifest = parseManifestFields(prodManifestPath);
  }

  const assetlinksPath = resolveRepoPath(repoRoot, signingConfig.assetlinks.path);
  if (fs.existsSync(assetlinksPath)) {
    const assetlinksFps = readAssetlinksFingerprints(assetlinksPath);
    checks.assetlinks_fingerprints = assetlinksFps.map(formatSha256Colon);
    checks.assetlinks_has_app_signing_key = assetlinksFps.includes(
      EXPECTED.appSigningKeySha256,
    );
    checks.assetlinks_has_upload_key = assetlinksFps.includes(
      EXPECTED.uploadKeySha256,
    );
    if (!checks.assetlinks_has_app_signing_key) {
      errors.push("assetlinks_missing_app_signing_key_for_twa");
    }
  } else {
    errors.push("missing_assetlinks_json");
  }

  if (!fs.existsSync(embeddedManifest)) {
    errors.push("missing_embedded_manifest");
  } else {
    checks.embedded_manifest = parseManifestFields(embeddedManifest);
    if (checks.production_manifest) {
      checks.manifest_embedded_matches_production =
        checks.embedded_manifest.background_color ===
          checks.production_manifest.background_color &&
        checks.embedded_manifest.splash_icon ===
          checks.production_manifest.splash_icon;
      if (!checks.manifest_embedded_matches_production) {
        errors.push("embedded_manifest_mismatch_vs_production");
      }
    }
  }

  if (!fs.existsSync(unsignedApk) || !fs.existsSync(unsignedAab)) {
    errors.push("missing_release_artifacts_run_gradle_first");
  }

  if (!fs.existsSync(signedApk) || !fs.existsSync(signedAab)) {
    errors.push("missing_signed_release_artifacts");
  }

  if (fs.existsSync(unsignedAab) && checks.source_splash) {
    const aabSplash = extractAabFile(
      unsignedAab,
      "base/res/drawable-xxhdpi-v4/splash.png",
    );
    const aabLauncher = extractAabFile(
      unsignedAab,
      "base/res/mipmap-xxhdpi-v4/ic_launcher.png",
    );
    const aabManifest = extractAabFile(
      unsignedAab,
      "base/res/raw/web_app_manifest.json",
    );

    if (!aabSplash) {
      errors.push("aab_missing_xxhdpi_splash");
    } else {
      checks.aab_splash = await pngPixelHash(aabSplash.path);
      checks.aab_splash.fileHash = aabSplash.hash;
      checks.splash_pixels_source_match_aab =
        checks.aab_splash.pixelHash === checks.source_splash.pixelHash;
      if (!checks.splash_pixels_source_match_aab) {
        errors.push("aab_splash_pixel_mismatch_vs_source");
      }
    }

    if (fs.existsSync(packagedSplash)) {
      checks.apk_packaged_splash = await pngPixelHash(packagedSplash);
      checks.splash_pixels_apk_packaged_match_aab =
        checks.apk_packaged_splash?.pixelHash === checks.aab_splash?.pixelHash;
      checks.splash_pixels_apk_packaged_match_source =
        checks.apk_packaged_splash?.pixelHash === checks.source_splash.pixelHash;
      if (!checks.splash_pixels_apk_packaged_match_aab) {
        errors.push("apk_aab_splash_pixel_mismatch");
      }
    } else {
      errors.push("missing_packaged_res_splash");
    }

    if (!aabLauncher) {
      errors.push("aab_missing_xxhdpi_launcher");
    } else if (checks.source_launcher) {
      checks.aab_launcher = await pngPixelHash(aabLauncher.path);
      checks.launcher_pixels_source_match_aab =
        checks.aab_launcher.pixelHash === checks.source_launcher.pixelHash;
      if (!checks.launcher_pixels_source_match_aab) {
        errors.push("aab_launcher_pixel_mismatch_vs_source");
      }
    }

    if (fs.existsSync(packagedLauncher) && checks.source_launcher) {
      checks.apk_packaged_launcher = await pngPixelHash(packagedLauncher);
      checks.launcher_pixels_apk_packaged_match_aab =
        checks.apk_packaged_launcher?.pixelHash === checks.aab_launcher?.pixelHash;
      if (!checks.launcher_pixels_apk_packaged_match_aab) {
        errors.push("apk_aab_launcher_pixel_mismatch");
      }
    } else {
      errors.push("missing_packaged_res_launcher");
    }

    if (aabManifest) {
      checks.aab_embedded_manifest = parseManifestFields(aabManifest.path);
      checks.aab_manifest_matches_production =
        checks.aab_embedded_manifest.background_color ===
          checks.production_manifest?.background_color &&
        checks.aab_embedded_manifest.splash_icon ===
          checks.production_manifest?.splash_icon;
      if (!checks.aab_manifest_matches_production) {
        errors.push("aab_embedded_manifest_stale");
      }
    }

    const badging = dumpApkBadging(unsignedApk);
    checks.apk_badging = badging;
    if (!badging) {
      errors.push("apk_badging_unavailable");
    } else {
      if (badging.packageName !== EXPECTED.packageName) errors.push("package_name_mismatch");
      if (badging.versionCode !== EXPECTED.versionCode) errors.push("version_code_mismatch");
      if (badging.versionName !== EXPECTED.versionName) errors.push("version_name_mismatch");
      checks.post_alpha11_version =
        badging.versionCode > EXPECTED.alpha11BaselineVersionCode;
      if (!checks.post_alpha11_version) errors.push("version_not_after_alpha11");
    }
  }

  if (fs.existsSync(signedApk)) {
    checks.signed_apk_signing = verifyApkSigning(signedApk);
    if (!checks.signed_apk_signing.ok) {
      if (checks.signed_apk_signing.matchesAppSigningKey) {
        errors.push("signed_apk_uses_app_signing_key_not_upload_key");
      } else {
        errors.push("signed_apk_signing_fail");
      }
    }
  }

  if (fs.existsSync(signedAab)) {
    checks.signed_aab_signing = verifyAabSigning(signedAab);
    if (!checks.signed_aab_signing.ok) errors.push("signed_aab_signing_fail");
  }

  if (mohamedApk) {
    checks.mohamed_apk_path = mohamedApk;
    checks.mohamed_apk_bytes = fs.statSync(mohamedApk).size;
    checks.mohamed_apk_mtime = fs.statSync(mohamedApk).mtime.toISOString();
    checks.mohamed_apk_file_hash = sha256(mohamedApk);

    const work = fs.mkdtempSync(path.join(tmpdir(), "p11-m-"));
    extractZip(mohamedApk, work);
    const mfMain = path.join(work, "res/raw/web_app_manifest.json");
    const mfBase = path.join(work, "base/res/raw/web_app_manifest.json");
    const mf = fs.existsSync(mfMain) ? mfMain : mfBase;
    if (fs.existsSync(mf)) {
      checks.mohamed_embedded_manifest = parseManifestFields(mf);
      checks.mohamed_manifest_was_stale =
        checks.mohamed_embedded_manifest.background_color !== EXPECTED.backgroundColor ||
        checks.mohamed_embedded_manifest.splash_icon !== EXPECTED.splashIconSrc;
    }
    const splashHit = walk(work).find((f) =>
      f.replace(/\\/g, "/").endsWith("drawable-xxhdpi-v4/splash.png"),
    );
    if (splashHit && checks.source_splash) {
      checks.mohamed_splash_pixels = await pngPixelHash(splashHit);
      checks.mohamed_splash_pixels_match_new_source =
        checks.mohamed_splash_pixels.pixelHash === checks.source_splash.pixelHash;
    }
    fs.rmSync(work, { recursive: true, force: true });

    checks.new_release_differs_from_mohamed_test_apk = fs.existsSync(signedApk)
      ? sha256(mohamedApk) !== sha256(signedApk)
      : true;
  }

  checks.ready_for_closed_testing = errors.length === 0;
  console.log(JSON.stringify({ ok: errors.length === 0, checks, errors }, null, 2));
  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

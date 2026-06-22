/**
 * P11 — Validate WebAPK splash manifest wiring (local, no device).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, "../public/manifest.webmanifest");
const maskablePath = path.join(__dirname, "../public/icons/pwa-maskable-512.png");
const circle512Path = path.join(__dirname, "../public/icons/pwa-icon-512.png");
const splashLaunchPath = path.join(__dirname, "../public/icons/pwa-splash-launch-512.png");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const errors = [];
const checks = {};

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
checks.background_color = manifest.background_color;
if (manifest.background_color !== "#020202") {
  errors.push("background_color_not_020202");
}

const icons = manifest.icons ?? [];
const splashEntry = icons.find((i) => i.src === "/icons/pwa-splash-launch-512.png");
const maskableEntry = icons.find((i) => i.src === "/icons/pwa-maskable-512.png");
const circle512Entry = icons.find((i) => i.src === "/icons/pwa-icon-512.png");

if (!splashEntry) errors.push("missing_splash_launch_icon_entry");
if (splashEntry?.purpose !== "any") errors.push("splash_launch_purpose_not_any");
if (splashEntry?.sizes !== "512x512") errors.push("splash_launch_size_not_512");

if (!maskableEntry) errors.push("missing_maskable_entry");
if (maskableEntry?.purpose !== "maskable") errors.push("maskable_purpose_changed");

if (circle512Entry) errors.push("pwa_icon_512_still_in_manifest");

const any512 = icons.filter(
  (i) => i.purpose === "any" && (i.sizes === "512x512" || i.sizes?.includes("512")),
);
if (any512.length !== 1 || any512[0].src !== "/icons/pwa-splash-launch-512.png") {
  errors.push("ambiguous_or_wrong_any_512_icon");
}

if (!fs.existsSync(splashLaunchPath)) errors.push("missing_splash_launch_png");
if (!fs.existsSync(maskablePath)) errors.push("missing_maskable_png");

if (fs.existsSync(maskablePath) && fs.existsSync(circle512Path)) {
  checks.maskable_sha256 = sha256(maskablePath);
  checks.pwa_icon_512_sha256 = sha256(circle512Path);
  checks.maskable_bytes_unchanged_vs_pwa_icon_512 =
    checks.maskable_sha256 === checks.pwa_icon_512_sha256;
}

if (fs.existsSync(splashLaunchPath) && fs.existsSync(circle512Path)) {
  checks.splash_launch_sha256 = sha256(splashLaunchPath);
  checks.splash_differs_from_circle_512 =
    checks.splash_launch_sha256 !== checks.pwa_icon_512_sha256;
  if (!checks.splash_differs_from_circle_512) {
    errors.push("splash_launch_same_bytes_as_circle_512");
  }
}

const ok = errors.length === 0;
console.log(JSON.stringify({ ok, checks, errors }, null, 2));
process.exit(ok ? 0 : 1);

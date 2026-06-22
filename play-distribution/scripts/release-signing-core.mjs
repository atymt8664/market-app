/**
 * Non-secret Android release signing SSOT helpers.
 * Config: play-distribution/release-signing.config.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playDistRoot = path.resolve(__dirname, "..");

export function loadReleaseSigningConfig() {
  const configPath = path.join(playDistRoot, "release-signing.config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`missing_release_signing_config:${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

/** Normalize SHA-256 fingerprint to 64 uppercase hex chars (no colons). */
export function normalizeSha256Fingerprint(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/[^0-9a-f]/gi, "").toUpperCase();
}

export function formatSha256Colon(value) {
  const n = normalizeSha256Fingerprint(value);
  if (n.length !== 64) return value;
  return n.match(/.{1,2}/g).join(":");
}

export function readAssetlinksFingerprints(assetlinksPath) {
  const j = JSON.parse(fs.readFileSync(assetlinksPath, "utf8"));
  const entry = Array.isArray(j)
    ? j.find((e) => e?.target?.namespace === "android_app")
    : null;
  const fps = entry?.target?.sha256_cert_fingerprints ?? [];
  return fps.map(normalizeSha256Fingerprint);
}

export function resolveRepoPath(repoRoot, relativePath) {
  return path.join(repoRoot, relativePath);
}

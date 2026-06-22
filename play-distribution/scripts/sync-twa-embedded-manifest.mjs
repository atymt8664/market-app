/**
 * P11 — Sync embedded TWA web_app_manifest.json from production PWA SSOT.
 * Source: artifacts/souq/public/manifest.webmanifest
 * Target: play-distribution/twa/souq-twa-android/app/src/main/res/raw/web_app_manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const source = path.join(repoRoot, "artifacts/souq/public/manifest.webmanifest");
const target = path.join(
  repoRoot,
  "play-distribution/twa/souq-twa-android/app/src/main/res/raw/web_app_manifest.json",
);

if (!fs.existsSync(source)) {
  console.error(JSON.stringify({ ok: false, error: "missing_production_manifest", source }));
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(source, "utf8"));
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(parsed)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      source,
      target,
      background_color: parsed.background_color,
      splash_icon: parsed.icons?.find((i) => i.src?.includes("splash"))?.src ?? null,
    },
    null,
    2,
  ),
);

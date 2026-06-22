/**
 * [P11-1] Generate favicon, PWA, maskable, TWA/Android icons from
 * attached_assets/SA-app-icon-circle-v1.png (unified SA circle SSOT).
 *
 * Usage: node scripts/generate-p11-icon-set.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const unified = path.resolve(
  __dirname,
  "../../../play-distribution/scripts/render-sa-circle-icon-unified.mjs",
);

const run = spawnSync(process.execPath, [unified], {
  stdio: "inherit",
  encoding: "utf8",
});
if (run.status !== 0) process.exit(run.status ?? 1);

const badgeScript = path.join(__dirname, "generate-notification-badge.mjs");
const badgeRun = spawnSync(process.execPath, [badgeScript], {
  stdio: "inherit",
  encoding: "utf8",
});
if (badgeRun.status !== 0) process.exit(badgeRun.status ?? 1);

console.log("[P11] Icon set generated from SA-app-icon-circle-v1.png");

/**
 * P17-9-13 — Android notification badge (monochrome) + large icon from Logo Master.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const iconsDir = path.join(publicDir, "icons");
const brandDir = path.join(publicDir, "brand");
const masterPath = path.join(brandDir, "logo-master.png");
const badgeSvg = path.join(iconsDir, "notification-badge.svg");

const BADGE_SIZES = [24, 48, 72, 96];

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
    ...commands.map((c) => quoteArg(String(c))),
  ];
  const result = spawnSync(parts.join(" "), {
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`sharp-cli failed (${output}): ${result.stderr || result.stdout}`);
  }
}

function main() {
  if (!fs.existsSync(badgeSvg)) {
    throw new Error(`Missing ${badgeSvg}`);
  }
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of BADGE_SIZES) {
    const out = path.join(iconsDir, `notification-badge-${size}.png`);
    runSharp(badgeSvg, out, "resize", String(size), String(size));
  }

  if (fs.existsSync(masterPath)) {
    const large = path.join(iconsDir, "notification-large-192.png");
    runSharp(masterPath, large, "resize", "192", "192", "--fit", "contain", "--background", "rgba(0,0,0,0)");
  } else {
    const pwa192 = path.join(iconsDir, "pwa-icon-192.png");
    if (fs.existsSync(pwa192)) {
      const large = path.join(iconsDir, "notification-large-192.png");
      runSharp(pwa192, large, "resize", "192", "192", "--fit", "contain", "--background", "rgba(0,0,0,0)");
      console.warn("[P17-9-13] logo-master.png missing — used pwa-icon-192.png for notification-large-192.png");
    } else {
      console.warn("[P17-9-13] logo-master.png and pwa-icon-192.png missing — skip notification-large-192.png");
    }
  }

  console.log("[P17-9-13] notification badge + large icons generated");
}

main();

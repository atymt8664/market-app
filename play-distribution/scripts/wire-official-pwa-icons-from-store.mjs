/**
 * Rasterizes official store icon `store-exports/play-phone-slides/SA.jpg` into
 * Souq `public/icons/` PNGs for manifest, favicon, and TWA — without modifying SA.jpg.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const saPath = path.join(root, "store-exports", "play-phone-slides", "SA.jpg");
const outDir = path.join(root, "..", "artifacts", "souq", "public", "icons");
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const imgBuf = await fs.readFile(saPath);

  for (const s of sizes) {
    await sharp(imgBuf)
      .resize(s, s)
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `pwa-icon-${s}.png`));
  }

  const inner = Math.round(512 * 0.72);
  const innerBuf = await sharp(imgBuf).resize(inner, inner).png().toBuffer();
  const pad = Math.floor((512 - inner) / 2);
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#10131a" },
  })
    .composite([{ input: innerBuf, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "pwa-maskable-512.png"));

  console.log("PWA icons written from SA.jpg →", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

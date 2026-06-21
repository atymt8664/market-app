/**
 * [P11-3] Validate favicon, PWA icons, and manifest against logo-master.png.
 * Exit 0 = PASS, 1 = FAIL. No file writes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isIcoFile,
  P11_FAVICON_HEAD_LINKS,
  renderP11FaviconHeadLinks,
} from "./p11-favicon-head-links.mjs";
import { buildHomeShareMeta, renderOgHtml } from "./og-share-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const rootDir = path.resolve(__dirname, "..");
const masterPath = path.join(publicDir, "brand", "logo-master.png");
const manifestPath = path.join(publicDir, "manifest.webmanifest");
const indexPath = path.join(rootDir, "index.html");
const swPath = path.join(publicDir, "sw.js");

const EXPECTED_MANIFEST = {
  name: "سوق العرب EU",
  short_name: "Souq Arab EU",
  display: "standalone",
  theme_color: "#0A0A0A",
  background_color: "#0A0A0A",
};

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const FORBIDDEN_PATHS = [
  path.join(publicDir, "logo.png"),
];
const FORBIDDEN_STRINGS = ["Souq Al Arab", "#FF3C00", "FF3C00"];

const errors = [];

function fail(msg) {
  errors.push(msg);
}

function fileExists(relFromPublic) {
  const p = path.join(publicDir, relFromPublic.replace(/^\//, ""));
  return fs.existsSync(p);
}

function readImageDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return {
          width: buf.readUInt16BE(i + 7),
          height: buf.readUInt16BE(i + 5),
        };
      }
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
    return null;
  }

  if (buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function scanDirForForbidden(dir) {
  for (const filePath of walkFiles(dir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (![".svg", ".ico", ".webmanifest", ".html"].includes(ext)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const s of FORBIDDEN_STRINGS) {
      if (content.includes(s)) fail(`Forbidden "${s}" in ${filePath}`);
    }
  }
}

function main() {
  if (!fs.existsSync(masterPath)) {
    fail(`Missing Logo Master: ${masterPath}`);
  } else {
    const dim = readImageDimensions(masterPath);
    if (!dim || dim.width < 512 || dim.height < 512) {
      fail(
        `logo-master.png should be at least 512×512 (got ${dim?.width ?? "?"}×${dim?.height ?? "?"})`,
      );
    }
  }

  for (const p of FORBIDDEN_PATHS) {
    if (fs.existsSync(p)) fail(`Legacy asset must be removed: ${p}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const [k, v] of Object.entries(EXPECTED_MANIFEST)) {
    if (manifest[k] !== v) {
      fail(`manifest.${k}: expected "${v}", got "${manifest[k]}"`);
    }
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length < 9) {
    fail("manifest.icons incomplete");
  }

  let hasMaskable512 = false;
  for (const icon of manifest.icons) {
    if (!icon.src?.startsWith("/icons/")) {
      fail(`manifest icon src must be under /icons/: ${icon.src}`);
    }
    if (!fileExists(icon.src)) {
      fail(`manifest icon missing on disk: ${icon.src}`);
    }
    const m = icon.sizes?.match(/^(\d+)x(\d+)$/);
    if (!m) {
      fail(`invalid manifest sizes: ${icon.sizes}`);
      continue;
    }
    const w = Number(m[1]);
    const h = Number(m[2]);
    const dim = readPngDimensions(path.join(publicDir, icon.src.replace(/^\//, "")));
    if (!dim || dim.width !== w || dim.height !== h) {
      fail(`${icon.src}: file is ${dim?.width}×${dim?.height}, manifest says ${w}×${h}`);
    }
    if (icon.purpose === "maskable" && w === 512) hasMaskable512 = true;
    if (icon.purpose === "any" && !icon.src.includes("maskable")) {
      const expected = `pwa-icon-${w}.png`;
      if (!icon.src.endsWith(expected)) {
        fail(`unexpected any icon path: ${icon.src}`);
      }
    }
  }

  if (!hasMaskable512) fail("missing maskable 512 icon in manifest");

  for (const size of PWA_SIZES) {
    const rel = `icons/pwa-icon-${size}.png`;
    if (!fileExists(`/${rel}`)) fail(`missing ${rel}`);
  }

  for (const fav of [16, 32, 48]) {
    const rel = `icons/favicon-${fav}.png`;
    if (!fileExists(`/${rel}`)) fail(`missing ${rel}`);
    const dim = readPngDimensions(path.join(publicDir, rel));
    if (!dim || dim.width !== fav || dim.height !== fav) {
      fail(`${rel}: expected ${fav}×${fav}`);
    }
  }

  const faviconIcoPath = path.join(publicDir, "favicon.ico");
  if (!fs.existsSync(faviconIcoPath)) {
    fail("missing public/favicon.ico");
  } else {
    const icoBuf = fs.readFileSync(faviconIcoPath);
    if (!isIcoFile(icoBuf)) {
      fail("favicon.ico is not a valid ICO container");
    }
    if (icoBuf.length < 100) {
      fail("favicon.ico too small — likely corrupt");
    }
  }

  const indexHtml = fs.readFileSync(indexPath, "utf8");
  for (const linkLine of P11_FAVICON_HEAD_LINKS) {
    if (!indexHtml.includes(linkLine)) {
      fail(`index.html missing favicon link: ${linkLine}`);
    }
  }
  if (indexHtml.includes('rel="icon" type="image/svg+xml"')) {
    fail("index.html must not use SVG favicon (unstable external PNG ref removed)");
  }

  const ogHtml = renderOgHtml(buildHomeShareMeta());
  const ogIconCount = (ogHtml.match(/rel="icon"/g) ?? []).length;
  if (ogIconCount < P11_FAVICON_HEAD_LINKS.filter((l) => l.includes('rel="icon"')).length) {
    fail(`OG crawler HTML missing rel=icon tags (got ${ogIconCount})`);
  }
  if (!ogHtml.includes('href="/favicon.ico"')) {
    fail("OG crawler HTML must link /favicon.ico for Googlebot");
  }
  if (!ogHtml.includes(renderP11FaviconHeadLinks())) {
    fail("OG crawler HTML favicon block drifted from canonical P11_FAVICON_HEAD_LINKS");
  }

  const hrefs = [
    ...indexHtml.matchAll(/href="(\/icons\/[^"]+|\/favicon\.ico|\/manifest\.webmanifest)"/g),
  ].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.endsWith(".webmanifest")) {
      if (!fs.existsSync(manifestPath)) fail("index.html manifest href missing");
      continue;
    }
    if (!fileExists(href)) fail(`index.html references missing asset: ${href}`);
  }

  if (!indexHtml.includes('apple-mobile-web-app-title" content="Souq Arab EU"')) {
    fail("index.html apple-mobile-web-app-title must be Souq Arab EU");
  }

  const sw = fs.readFileSync(swPath, "utf8");
  for (const iconRef of ["/icons/pwa-icon-192.png", "/icons/pwa-icon-512.png"]) {
    if (!sw.includes(iconRef)) fail(`sw.js missing ${iconRef}`);
    if (!fileExists(iconRef)) fail(`sw.js icon missing on disk: ${iconRef}`);
  }

  const p512 = path.join(publicDir, "icons", "pwa-icon-512.png");
  const playCopy = path.join(publicDir, "brand", "play-store-icon-512.png");
  if (fs.existsSync(p512) && fs.existsSync(playCopy)) {
    const a = fs.readFileSync(p512);
    const b = fs.readFileSync(playCopy);
    if (!a.equals(b)) fail("play-store-icon-512.png must match pwa-icon-512.png");
  }

  const faviconSvg = fs.readFileSync(path.join(publicDir, "favicon.svg"), "utf8");
  if (!faviconSvg.includes("data:image/png;base64,")) {
    fail("favicon.svg must embed PNG as data URI (no external /icons/ href)");
  }
  if (faviconSvg.includes('href="/icons/')) {
    fail("favicon.svg must not reference external /icons/ paths");
  }
  for (const s of FORBIDDEN_STRINGS) {
    if (faviconSvg.includes(s)) fail(`favicon.svg contains forbidden: ${s}`);
  }

  scanDirForForbidden(path.join(publicDir, "icons"));
  scanDirForForbidden(path.join(publicDir, "brand"));

  if (errors.length) {
    console.error("[P11-3] FAIL — icon/manifest validation:\n");
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  }

  console.log("[P11-3] PASS — Logo Master, manifest, favicon, PWA, maskable, HTML, SW aligned.");
}

main();

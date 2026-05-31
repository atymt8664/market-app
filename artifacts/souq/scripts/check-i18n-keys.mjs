import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "..", "src");
const localesDir = path.join(src, "i18n", "locales");

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx|ts)$/.test(f)) files.push(p);
  }
  return files;
}

const ar = JSON.parse(fs.readFileSync(path.join(localesDir, "ar.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
const de = JSON.parse(fs.readFileSync(path.join(localesDir, "de.json"), "utf8"));

const re = /\bt\(\s*["']([^"']+)["']/g;
const used = new Set();
for (const file of walk(src)) {
  const c = fs.readFileSync(file, "utf8");
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(c))) used.add(m[1]);
}

const keys = [...used].sort();
const missingAr = keys.filter((k) => !ar[k]);
const missingEn = keys.filter((k) => !en[k]);
const missingDe = keys.filter((k) => !de[k]);

console.log("t() unique keys:", keys.length);
console.log("missing ar:", missingAr.length);
console.log("missing en:", missingEn.length);
console.log("missing de:", missingDe.length);

if (missingAr.length) {
  console.log("missing ar sample:", missingAr.slice(0, 10).join(", "));
}
if (missingEn.length) {
  console.log("missing en sample:", missingEn.slice(0, 10).join(", "));
}
if (missingDe.length) {
  console.log("missing de sample:", missingDe.slice(0, 10).join(", "));
}

process.exit(missingAr.length || missingEn.length || missingDe.length ? 1 : 0);

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
const keys = new Set(Object.keys(ar));
const re = /\bt\(\s*["']([^"']+)["']/g;
const used = new Set();
for (const file of walk(src)) {
  const c = fs.readFileSync(file, "utf8");
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(c))) used.add(m[1]);
}
const missing = [...used].filter((k) => !keys.has(k)).sort();
console.log("t() unique keys:", used.size);
console.log("missing from ar.json:", missing.length);
if (missing.length) console.log(missing.join("\n"));
process.exit(missing.length ? 1 : 0);

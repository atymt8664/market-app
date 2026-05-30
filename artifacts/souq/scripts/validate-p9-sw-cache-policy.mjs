/**
 * P9 — validates production SW deploy-stability policy (no stale HTML/JS precache).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const swPath = path.join(root, "public", "sw.js");
const distSwPath = path.join(root, "dist", "sw.js");

function readSw(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

const source = readSw(swPath);
if (!source) {
  console.error("FAIL: public/sw.js not found");
  process.exit(1);
}

function precacheBlock(source) {
  const match = source.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  return match ? match[1] : "";
}

const precache = precacheBlock(source);

const checks = [
  {
    name: "no index.html precache",
    pass: !precache.includes('"/index.html"') && !precache.includes('"/",'),
  },
  {
    name: "no navigate runtime cache",
    pass: !source.includes("cache.put") && !source.includes("caches.match(\"/index.html\")"),
  },
  {
    name: "assets bypass SW",
    pass: source.includes("/assets/") && source.includes("shouldBypassServiceWorker"),
  },
  {
    name: "html network-only",
    pass: source.includes("isHtmlNavigation") && source.includes("event.respondWith(fetch(req))"),
  },
  {
    name: "skipWaiting on install",
    pass: source.includes("skipWaiting"),
  },
  {
    name: "clients.claim on activate",
    pass: source.includes("clients.claim"),
  },
  {
    name: "cache version bumped",
    pass: source.includes("v3-deploy-shell"),
  },
];

let failed = 0;
for (const check of checks) {
  const status = check.pass ? "PASS" : "FAIL";
  console.log(`${status}: ${check.name}`);
  if (!check.pass) failed += 1;
}

const dist = readSw(distSwPath);
if (dist) {
  const distOk = dist.includes("v3-deploy-shell");
  console.log(`${distOk ? "PASS" : "FAIL"}: dist/sw.js copied on build`);
  if (!distOk) failed += 1;
} else {
  console.log("SKIP: dist/sw.js (run build first for dist copy check)");
}

process.exit(failed > 0 ? 1 : 0);

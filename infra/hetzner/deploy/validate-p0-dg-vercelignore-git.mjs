#!/usr/bin/env node
/** P0-DG — static guard: .vercelignore must not break Vercel Git Integration (ADR-006) */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deployDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(deployDir, "../../..");
const ignorePath = path.join(repoRoot, "artifacts/souq/.vercelignore");
const vercelJsonPath = path.join(repoRoot, "artifacts/souq/vercel.json");

const ignore = readFileSync(ignorePath, "utf8");
const vercelJson = readFileSync(vercelJsonPath, "utf8");

const forbiddenPatterns = [
  "artifacts/souq",
  /^dist$/m,
  /^\.vercel$/m,
];

const requiredSourcePaths = [
  "artifacts/souq/package.json",
  "artifacts/souq/vercel.json",
  "artifacts/souq/index.html",
  "artifacts/souq/src/main.tsx",
  "artifacts/souq/api/og.js",
];

function patternToRegex(line) {
  const escaped = line.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp(`(^|/)${escaped}($|/)`);
}

function isIgnored(relativePath, patterns) {
  for (const raw of patterns) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (patternToRegex(line).test(relativePath)) return true;
  }
  return false;
}

const patterns = ignore.split("\n");
const checks = [];

for (const rule of forbiddenPatterns) {
  const name = rule instanceof RegExp ? rule.source : rule;
  const hit =
    rule instanceof RegExp ? rule.test(ignore) : ignore.split("\n").some((l) => l.trim() === rule);
  checks.push({
    name: `.vercelignore must not contain forbidden pattern: ${name}`,
    pass: !hit,
  });
}

for (const p of requiredSourcePaths) {
  checks.push({
    name: `Git source path not ignored: ${p}`,
    pass: !isIgnored(p, patterns),
  });
}

checks.push({
  name: "vercel.json declares outputDirectory dist",
  pass: vercelJson.includes('"outputDirectory": "dist"'),
});

checks.push({
  name: "vercel.json buildCommand runs @workspace/souq build",
  pass: vercelJson.includes("@workspace/souq run build"),
});

let failed = 0;
for (const c of checks) {
  if (c.pass) {
    console.log(`PASS  ${c.name}`);
  } else {
    failed++;
    console.error(`FAIL  ${c.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} P0-DG vercelignore Git checks passed.`);

#!/usr/bin/env node
/**
 * P0 — Official Vercel Production deploy for market-app-souq.
 * Run from monorepo root: node infra/hetzner/deploy/vercel-prod-deploy.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const souqRoot = path.join(repoRoot, "artifacts/souq");
const project = "market-app-souq";
const requiredScript = path.join(souqRoot, "scripts/assert-safe-frontend-api-env.mjs");

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function preflight() {
  if (!fs.existsSync(requiredScript)) {
    console.error(`FAIL: missing ${requiredScript} — must be tracked in git for Vercel build.`);
    process.exit(2);
  }
  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "artifacts/souq/scripts/assert-safe-frontend-api-env.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (tracked.status !== 0) {
    console.error("FAIL: assert-safe-frontend-api-env.mjs is not tracked — git add before deploy.");
    process.exit(2);
  }
  console.log("PREFLIGHT_OK project=%s root=%s", project, repoRoot);
}

preflight();

// Root Directory in Vercel = artifacts/souq (see docs/runbooks/P17-5-7-production-deploy.md)
run("npx", ["--yes", "vercel", "link", "--project", project, "--yes"], souqRoot);
run("npx", ["--yes", "vercel", "deploy", "--prod", "--yes", "--archive=tgz"], souqRoot);

console.log("VERCEL_PROD_DEPLOY_DONE");

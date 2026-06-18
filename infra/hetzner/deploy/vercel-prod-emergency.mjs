#!/usr/bin/env node
/**
 * P0-DG-2 — ADR-006 Emergency-only local Production frontend deploy.
 *
 * Requires Mohamed explicit written approval BEFORE running:
 *   SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED=1
 *   SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON="<incident + intended SHA — no secrets>"
 *
 * Restore Git-only path within 24h. Final Report mandatory.
 *
 * Usage (emergency only):
 *   node infra/hetzner/deploy/vercel-prod-emergency.mjs --archive
 *   node infra/hetzner/deploy/vercel-prod-emergency.mjs --prebuilt
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertEmergencyFrontendDeployApproved } from "./p0-dg-frontend-deploy-guard.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const souqRoot = path.join(repoRoot, "artifacts/souq");
const project = "market-app-souq";

const mode = process.argv.includes("--prebuilt") ? "prebuilt" : process.argv.includes("--archive") ? "archive" : null;

if (!mode) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "missing_mode",
      usage: "node infra/hetzner/deploy/vercel-prod-emergency.mjs --archive | --prebuilt",
    }),
  );
  process.exit(2);
}

assertEmergencyFrontendDeployApproved({ script: "vercel-prod-emergency.mjs" });

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (mode === "archive") {
  run("npx", ["--yes", "vercel", "link", "--project", project, "--yes"], souqRoot);
  run("npx", ["--yes", "vercel", "deploy", "--prod", "--yes", "--archive=tgz"], souqRoot);
  console.log("VERCEL_PROD_EMERGENCY_ARCHIVE_DONE");
} else {
  run("npx", ["--yes", "vercel", "build", "--prod", "--yes"], souqRoot);
  run("npx", ["--yes", "vercel", "deploy", "--prebuilt", "--prod", "--yes"], souqRoot);
  console.log("VERCEL_PROD_EMERGENCY_PREBUILT_DONE");
}

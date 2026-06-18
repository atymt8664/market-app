#!/usr/bin/env node
/** P0-DG-2 — static guards: ADR-006 blocks local Production frontend CLI deploy */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deployDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(deployDir, "../../..");

function read(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

const legacy = read("infra/hetzner/deploy/vercel-prod-deploy.mjs");
const guard = read("infra/hetzner/deploy/p0-dg-frontend-deploy-guard.mjs");
const emergency = read("infra/hetzner/deploy/vercel-prod-emergency.mjs");
const p0Runbook = read("docs/runbooks/P0-production-frontend-deploy.md");

const checks = [
  {
    name: "vercel-prod-deploy.mjs calls blockLocalProductionFrontendDeploy",
    pass: legacy.includes("blockLocalProductionFrontendDeploy"),
  },
  {
    name: "vercel-prod-deploy.mjs does not invoke vercel deploy",
    pass: !legacy.includes('run("npx", ["--yes", "vercel", "deploy"'),
  },
  {
    name: "guard module exports block + emergency assert",
    pass:
      guard.includes("export function blockLocalProductionFrontendDeploy") &&
      guard.includes("export function assertEmergencyFrontendDeployApproved"),
  },
  {
    name: "emergency script requires SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED",
    pass: emergency.includes("SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED"),
  },
  {
    name: "emergency script requires SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON",
    pass: emergency.includes("SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON"),
  },
  {
    name: "emergency script supports --archive and --prebuilt modes",
    pass: emergency.includes('"--prebuilt"') && emergency.includes('"--archive"'),
  },
  {
    name: "P0 runbook references vercel-prod-emergency.mjs",
    pass: p0Runbook.includes("vercel-prod-emergency.mjs"),
  },
  {
    name: "P0 runbook states Git-only official path",
    pass: p0Runbook.includes("Vercel Git Integration"),
  },
  {
    name: "P0 runbook documents emergency env vars",
    pass:
      p0Runbook.includes("SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED") &&
      p0Runbook.includes("SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON"),
  },
];

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

console.log(`\nAll ${checks.length} P0-DG-2 guard checks passed.`);

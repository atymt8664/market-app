#!/usr/bin/env node
/**
 * P0-DG-2 — BLOCKED for Production (ADR-006 Accepted).
 * Legacy entry point retained so old runbooks fail loudly instead of uploading local archives.
 *
 * Official path: git push origin main → Vercel Git Integration → Production
 * Runbook: docs/runbooks/P0-production-frontend-deploy.md
 * Emergency only: infra/hetzner/deploy/vercel-prod-emergency.mjs
 */
import { blockLocalProductionFrontendDeploy } from "./p0-dg-frontend-deploy-guard.mjs";

blockLocalProductionFrontendDeploy({
  script: "vercel-prod-deploy.mjs",
  attempted: "vercel deploy --prod --archive=tgz (blocked)",
});

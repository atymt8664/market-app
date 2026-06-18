/**
 * P0-DG-2 — ADR-006 local Production frontend deploy guard (shared).
 * Official path: git push origin main → Vercel Git Integration → Production.
 */
const OFFICIAL_PATH = "git push origin main → Vercel Git Integration → Production";
const RUNBOOK = "docs/runbooks/P0-production-frontend-deploy.md";
const EMERGENCY_SCRIPT = "infra/hetzner/deploy/vercel-prod-emergency.mjs";

export function blockLocalProductionFrontendDeploy({ script, attempted } = {}) {
  const payload = {
    ok: false,
    adr: "ADR-006",
    subPhase: "P0-DG-2",
    reason: "local_production_frontend_deploy_blocked",
    script: script ?? "unknown",
    attempted: attempted ?? null,
    official_path: OFFICIAL_PATH,
    runbook: RUNBOOK,
    emergency: `${EMERGENCY_SCRIPT} (Mohamed written approval + SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED=1)`,
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

export function assertEmergencyFrontendDeployApproved({ script } = {}) {
  if (process.env.SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED !== "1") {
    const payload = {
      ok: false,
      adr: "ADR-006",
      subPhase: "P0-DG-2",
      reason: "emergency_frontend_deploy_not_approved",
      script: script ?? "vercel-prod-emergency.mjs",
      required_env: "SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED=1",
      note: "Mohamed explicit written approval required before setting this env var.",
      official_path: OFFICIAL_PATH,
    };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const reason = (process.env.SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON ?? "").trim();
  if (!reason) {
    const payload = {
      ok: false,
      adr: "ADR-006",
      subPhase: "P0-DG-2",
      reason: "emergency_frontend_deploy_reason_required",
      script: script ?? "vercel-prod-emergency.mjs",
      required_env: "SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON=<incident summary>",
      note: "Document incident and intended commit SHA; no secrets in this value.",
    };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.warn(
    JSON.stringify({
      ok: true,
      warning: "EMERGENCY_FRONTEND_DEPLOY",
      adr: "ADR-006",
      script: script ?? "vercel-prod-emergency.mjs",
      reason,
      restore_within_hours: 24,
    }),
  );
}

export const P0_DG_FRONTEND_DEPLOY_META = {
  OFFICIAL_PATH,
  RUNBOOK,
  EMERGENCY_SCRIPT,
};

#!/usr/bin/env bash
# Phase 7 gradual cutover — zero public downtime (Railway stays live until Vercel/DNS switch).
# REQUIRES: SOUQ_CUTOVER_APPROVED=1 (Mohamed). See CUTOVER-WARNING.md — do not run accidentally.
set -euo pipefail

_GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/_guards"
# shellcheck source=/dev/null
[[ -f "${_GUARD_DIR}/require-mohamed-cutover-approval.sh" ]] && source "${_GUARD_DIR}/require-mohamed-cutover-approval.sh"
if [[ "${SOUQ_CUTOVER_APPROVED:-}" != "1" ]]; then
  echo "REFUSED: Set SOUQ_CUTOVER_APPROVED=1 only after explicit approval from Mohamed." >&2
  exit 99
fi

BASE="/opt/souq-arab"
COMPOSE_MAIN="${BASE}/api/docker/docker-compose.yml"
COMPOSE_SHADOW="${BASE}/phase7/docker-compose.production-shadow.yml"
PROD_IMAGE="${SOUQ_PROD_IMAGE:-souq-api:production-candidate}"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"

log() { printf '[phase7] %s\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

log "step1 external read-only (Railway fallback)"
bash "${BASE}/scripts/phase7-prod-readonly-external.sh"

if ! bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null 2>&1; then
  log "STOP production env not filled — Railway remains primary; fill api.env.production then re-run"
  exit 2
fi

grep -q "$STAGING_REF" "${BASE}/config/api.env.production" 2>/dev/null && { echo "REFUSE staging ref in production env"; exit 1; }

log "step2 production image tag (local candidate from shadow)"
if docker images -q souq-api:staging-shadow-20260520 2>/dev/null | grep -q .; then
  docker tag souq-api:staging-shadow-20260520 "$PROD_IMAGE" 2>/dev/null || true
fi

log "step3 parallel production shadow on :3002"
export SOUQ_PROD_IMAGE="$PROD_IMAGE"
docker compose -f "$COMPOSE_SHADOW" up -d api-prod-shadow
for _ in $(seq 1 40); do
  curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null

log "step4 VPS production shadow smoke"
bash "${BASE}/scripts/phase7-vps-prod-shadow-smoke.sh"

if [[ "${SOUQ_CUTOVER_APPROVED:-}" != "1" ]]; then
  log "step5 SKIP activate :3001 (set SOUQ_CUTOVER_APPROVED=1 to swap primary upstream on VPS)"
  docker compose -f "$COMPOSE_SHADOW" down
  log "phase7 partial complete — Railway fallback unchanged"
  exit 0
fi

log "step5 activate production on primary port (VPS only — public still Railway until DNS/Vercel)"
SOUQ_CUTOVER_APPROVED=1 bash "${BASE}/scripts/use-production-env.sh"
export SOUQ_API_IMAGE="$PROD_IMAGE"
bash "${BASE}/scripts/deploy-api.sh" --image "$PROD_IMAGE" --skip-pull
bash "${BASE}/scripts/verify-deploy.sh"
docker compose -f "$COMPOSE_SHADOW" down 2>/dev/null || true

log "phase7 VPS primary is production — Railway NOT stopped"
echo "OK phase7 cutover VPS primary"

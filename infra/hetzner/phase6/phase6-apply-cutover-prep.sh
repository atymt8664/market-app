#!/usr/bin/env bash
# Phase 6: Production cutover PREP on VPS — no cutover, no production DB, staging stays active.
set -euo pipefail

DEPLOY_USER="deploy"
BASE="/opt/souq-arab"
MARKER_DIR="/etc/souq"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGING_REF="qkczposlooaldmsjfmun"

log() { printf '[phase6] %s\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }

log "ensure STAGING remains active"
if [[ -f "${BASE}/scripts/use-staging-env.sh" ]]; then
  bash "${BASE}/scripts/use-staging-env.sh"
fi

log "production env template"
install -d -m 0750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${BASE}/config"
if [[ ! -f "${BASE}/config/api.env.production" ]]; then
  install -m 0600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
    "${SCRIPT_DIR}/api.env.production.example" "${BASE}/config/api.env.production"
  log "created empty api.env.production from example (fill manually before cutover)"
else
  log "api.env.production already exists — not overwritten"
fi

if grep -q "$STAGING_REF" "${BASE}/config/api.env.production" 2>/dev/null; then
  echo "REFUSE: staging ref found in api.env.production" >&2
  exit 1
fi

log "sync phase6 scripts and docs"
install -d -m 0755 "${BASE}/scripts" "${BASE}/phase6"
for f in \
  use-production-env.sh \
  check-production-env-ready.sh \
  phase6-prod-api-smoke-readonly.sh \
  phase6-dry-run-prep.sh \
  phase6-staging-redis-spike.sh \
  phase6-image-prep-checklist.sh \
  verify-phase6.sh; do
  install -m 0755 "${SCRIPT_DIR}/${f}" "${BASE}/scripts/${f}"
done
install -m 0644 "${SCRIPT_DIR}/README.md" "${BASE}/phase6/README.md"
install -m 0644 "${SCRIPT_DIR}/CUTOVER-CHECKLIST.md" "${BASE}/phase6/CUTOVER-CHECKLIST.md"
install -m 0644 "${SCRIPT_DIR}/SCALE-ROADMAP.md" "${BASE}/phase6/SCALE-ROADMAP.md"
install -m 0644 "${SCRIPT_DIR}/IMAGE-TAGGING.md" "${BASE}/phase6/IMAGE-TAGGING.md"
install -m 0644 "${SCRIPT_DIR}/docker-compose.scale-prep.yml" "${BASE}/phase6/docker-compose.scale-prep.yml"
install -m 0755 "${SCRIPT_DIR}/phase6-apply-cutover-prep.sh" "${BASE}/scripts/phase6-apply-cutover-prep.sh"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE}/phase6"

log "marker"
mkdir -p "${MARKER_DIR}"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"${MARKER_DIR}/phase6-prep-applied-at.txt"
echo "production-cutover-prep-no-cutover" >>"${MARKER_DIR}/phase6-prep-applied-at.txt"

log "phase6 apply complete (staging still active)"

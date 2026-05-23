#!/usr/bin/env bash
# Infrastructure test for deploy/verify/rollback — uses readiness-stub only (not production API).
set -euo pipefail

BASE="/opt/souq-arab"
COMPOSE_DIR="${BASE}/api/docker"
RELEASES="${BASE}/releases"
LOG="/var/log/souq-arab/deploy.log"

log() { printf '[%s] [workflow-test] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

install -d -m 0750 "$RELEASES"

log "step1 ensure stub up"
cd "$COMPOSE_DIR"
docker compose --profile production down 2>/dev/null || true
docker compose --profile readiness-stub up -d
for _ in $(seq 1 15); do
  curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS http://127.0.0.1/api/healthz >/dev/null
echo "readiness-stub" >"${RELEASES}/CURRENT_TAG"
echo "stub" >"${RELEASES}/CURRENT_MODE"
echo "readiness-stub" >"${RELEASES}/PREVIOUS_TAG"
echo "stub" >"${RELEASES}/PREVIOUS_MODE"

log "step2 simulate failed production deploy (expect recovery)"
export SOUQ_API_IMAGE="nginx:1.24-alpine"
docker compose --profile readiness-stub down
if docker compose --profile production pull 2>/dev/null; then
  docker compose --profile production up -d || true
else
  log "production pull skipped or failed — expected for placeholder"
fi
if ! curl -fsS --max-time 5 http://127.0.0.1/api/healthz >/dev/null 2>&1; then
  log "healthz down — restoring stub"
  docker compose --profile production down 2>/dev/null || true
  docker compose --profile readiness-stub up -d
  echo "stub" >"${RELEASES}/CURRENT_MODE"
  echo "readiness-stub" >"${RELEASES}/CURRENT_TAG"
fi
curl -fsS http://127.0.0.1/api/healthz >/dev/null

log "step3 verify-deploy"
"${BASE}/scripts/verify-deploy.sh"

log "step4 rollback-api (stub mode)"
"${BASE}/scripts/rollback-api.sh"
curl -fsS http://127.0.0.1/api/healthz >/dev/null

log "workflow-test PASS"

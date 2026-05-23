#!/usr/bin/env bash
# Phase 6.1 — deploy forgot-password hardening to production shadow (:3002) only.
# Rollback-safe: saves PREVIOUS_PROD_SHADOW_IMAGE before swap.
set -euo pipefail

BASE="/opt/souq-arab"
COMPOSE="${BASE}/phase7/docker-compose.production-shadow.yml"
RELEASES="${BASE}/releases"
LOG="/var/log/souq-arab/deploy.log"
NEW_IMAGE="${SOUQ_PROD_IMAGE:-}"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"

usage() {
  echo "Usage: sudo SOUQ_PROD_IMAGE=souq-api:phase6-1-forgot-hardening-YYYYMMDD $0" >&2
  exit 1
}

log() {
  printf '[%s] phase6.1 %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

rollback_shadow() {
  local prev="${1:-}"
  [[ -n "$prev" ]] || return 1
  log "rollback prod shadow -> ${prev}"
  export SOUQ_PROD_IMAGE="$prev"
  docker compose -f "$COMPOSE" up -d api-prod-shadow
  for _ in $(seq 1 40); do
    curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
[[ -n "$NEW_IMAGE" ]] || usage
[[ -f "$COMPOSE" ]] || { echo "Missing ${COMPOSE}" >&2; exit 1; }
docker image inspect "$NEW_IMAGE" >/dev/null 2>&1 || { echo "Image not found: ${NEW_IMAGE}" >&2; exit 1; }

bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null
grep -q "$STAGING_REF" "${BASE}/config/api.env.production" 2>/dev/null && {
  echo "REFUSE staging ref in production env"
  exit 1
}
grep -q "$PROD_REF" "${BASE}/config/api.env.production" 2>/dev/null || {
  echo "REFUSE production ref missing"
  exit 1
}

install -d -m 0755 "$RELEASES"
PREV=""
if docker compose -f "$COMPOSE" ps -q api-prod-shadow 2>/dev/null | grep -q .; then
  PREV="$(docker inspect souq-arab-api-prod-shadow-api-prod-shadow-1 --format '{{.Config.Image}}' 2>/dev/null || true)"
fi
[[ -n "$PREV" ]] && echo "$PREV" >"${RELEASES}/PREVIOUS_PROD_SHADOW_IMAGE"
echo "$NEW_IMAGE" >"${RELEASES}/CURRENT_PROD_SHADOW_IMAGE"

log "deploy prod shadow ${NEW_IMAGE} prev=${PREV:-none}"

export SOUQ_PROD_IMAGE="$NEW_IMAGE"
if ! docker compose -f "$COMPOSE" up -d api-prod-shadow; then
  log "compose up failed"
  [[ -n "$PREV" ]] && rollback_shadow "$PREV" || true
  exit 1
fi

deadline=$((SECONDS + 120))
until curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null 2>&1; do
  if (( SECONDS > deadline )); then
    log "healthz :3002 timeout — rollback"
    docker compose -f "$COMPOSE" stop api-prod-shadow 2>/dev/null || true
    if [[ -n "$PREV" ]]; then
      rollback_shadow "$PREV" || true
      echo "$PREV" >"${RELEASES}/CURRENT_PROD_SHADOW_IMAGE"
    fi
    echo "FAIL phase6.1 healthz timeout"
    exit 1
  fi
  sleep 2
done

log "prod shadow healthy on :3002"
echo "OK phase6.1 deploy ${NEW_IMAGE}"

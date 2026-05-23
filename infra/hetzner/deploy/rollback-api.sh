#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/souq-arab"
COMPOSE_DIR="${BASE}/api/docker"
RELEASES="${BASE}/releases"
LOG="/var/log/souq-arab/deploy.log"
PREV_FILE="${RELEASES}/PREVIOUS_TAG"
PREV_MODE_FILE="${RELEASES}/PREVIOUS_MODE"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
[[ -f "$PREV_FILE" ]] || { echo "No PREVIOUS_TAG to rollback." >&2; exit 1; }

PREV="$(cat "$PREV_FILE")"
PREV_MODE="stub"
[[ -f "$PREV_MODE_FILE" ]] && PREV_MODE="$(cat "$PREV_MODE_FILE")"

log "rollback to ${PREV} mode=${PREV_MODE}"
cd "$COMPOSE_DIR"
docker compose --profile production down 2>/dev/null || true

if [[ "$PREV_MODE" == "stub" ]] || [[ "$PREV" == "readiness-stub" ]]; then
  docker compose --profile readiness-stub up -d
  echo "readiness-stub" >"${RELEASES}/CURRENT_TAG"
  echo "stub" >"${RELEASES}/CURRENT_MODE"
else
  export SOUQ_API_IMAGE="$PREV"
  docker compose --profile production up -d
  echo "$PREV" >"${RELEASES}/CURRENT_TAG"
  echo "production" >"${RELEASES}/CURRENT_MODE"
fi

curl -fsS http://127.0.0.1/api/healthz >/dev/null
log "rollback success"
echo "OK rollback ${PREV}"

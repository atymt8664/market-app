#!/usr/bin/env bash
# Deploy tagged API image to VPS — idempotent. Requires explicit --image TAG.
# Does not print env or secrets.
set -euo pipefail

BASE="/opt/souq-arab"
COMPOSE_DIR="${BASE}/api/docker"
ENV_FILE="${BASE}/config/api.env"
RELEASES="${BASE}/releases"
LOG="/var/log/souq-arab/deploy.log"

usage() {
  echo "Usage: $0 --image REGISTRY/souq-api:TAG [--skip-pull]" >&2
  exit 1
}

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

restore_stub() {
  log "restore readiness-stub upstream"
  cd "$COMPOSE_DIR"
  docker compose --profile production down 2>/dev/null || true
  docker compose --profile readiness-stub up -d
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1; then
      echo "readiness-stub" >"${RELEASES}/CURRENT_TAG"
      echo "stub" >"${RELEASES}/CURRENT_MODE"
      return 0
    fi
    sleep 1
  done
  log "stub healthz still down after restore"
  return 1
}

IMAGE=""
SKIP_PULL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="${2:-}"; shift 2 ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done
[[ -n "$IMAGE" ]] || usage

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE} — create from api.env.example (no secrets in repo)." >&2
  exit 1
fi

install -d -m 0755 -o "${SUDO_USER:-deploy}:${SUDO_USER:-deploy}" "$RELEASES" 2>/dev/null || install -d -m 0755 "$RELEASES"
PREV=""
PREV_MODE="stub"
[[ -f "${RELEASES}/CURRENT_TAG" ]] && PREV="$(cat "${RELEASES}/CURRENT_TAG")"
[[ -f "${RELEASES}/CURRENT_MODE" ]] && PREV_MODE="$(cat "${RELEASES}/CURRENT_MODE")"
[[ -n "$PREV" ]] && cp "${RELEASES}/CURRENT_TAG" "${RELEASES}/PREVIOUS_TAG"
echo "$PREV_MODE" >"${RELEASES}/PREVIOUS_MODE"

log "deploy start image=${IMAGE} prev=${PREV:-none} prev_mode=${PREV_MODE}"
export SOUQ_API_IMAGE="$IMAGE"

cd "$COMPOSE_DIR"
docker compose --profile readiness-stub down 2>/dev/null || true
if [[ "$SKIP_PULL" -eq 0 ]]; then
  docker compose --profile production pull
fi
if ! docker compose --profile production up -d; then
  log "compose up failed — restoring upstream"
  if [[ "$PREV_MODE" == "stub" ]] || [[ -z "$PREV" ]]; then
    restore_stub
  elif [[ -n "$PREV" ]]; then
    SOUQ_API_IMAGE="$PREV" docker compose --profile production up -d || restore_stub
  else
    restore_stub
  fi
  echo "FAIL deploy compose"
  exit 1
fi

deadline=$((SECONDS + 120))
until curl -fsS http://127.0.0.1/api/healthz >/dev/null 2>&1; do
  if (( SECONDS > deadline )); then
    log "healthz timeout — rollback"
    docker compose --profile production down 2>/dev/null || true
    if [[ -n "$PREV" ]] && [[ "$PREV_MODE" == "production" ]]; then
      SOUQ_API_IMAGE="$PREV" docker compose --profile production up -d || restore_stub
      echo "$PREV" >"${RELEASES}/CURRENT_TAG"
      echo "production" >"${RELEASES}/CURRENT_MODE"
    else
      restore_stub
    fi
    echo "FAIL deploy healthz timeout"
    exit 1
  fi
  sleep 2
done

echo "$IMAGE" >"${RELEASES}/CURRENT_TAG"
echo "production" >"${RELEASES}/CURRENT_MODE"
log "deploy success"
echo "OK deploy ${IMAGE}"

#!/usr/bin/env bash
# Official entry point — production PUBLIC API deploy.
# Orchestrates (without merging STAGING/PRODUCTION env boundaries):
#   1) deploy-api.sh        -> :3001 main container (api.env — existing role unchanged)
#   2) phase8 prod-shadow   -> :3002 prod-shadow (api.env.production — public nginx upstream)
#   3) verify-production-public-api.sh -> https://api.souq-arab.com gate (FAIL = incomplete deploy)
set -euo pipefail

BASE="/opt/souq-arab"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

IMAGE=""
SKIP_PULL=0

usage() {
  echo "Usage: sudo bash deploy-production-public-api.sh --image souq-api:TAG [--skip-pull]" >&2
  exit 1
}

resolve_script() {
  local name="$1"
  if [[ -f "${BASE}/scripts/${name}" ]]; then
    printf '%s\n' "${BASE}/scripts/${name}"
    return 0
  fi
  if [[ -f "${SCRIPT_DIR}/${name}" ]]; then
    printf '%s\n' "${SCRIPT_DIR}/${name}"
    return 0
  fi
  if [[ -f "${SCRIPT_DIR}/../phase8/${name}" ]]; then
    printf '%s\n' "${SCRIPT_DIR}/../phase8/${name}"
    return 0
  fi
  echo "Missing script: ${name}" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="${2:-}"; shift 2 ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done
[[ -n "$IMAGE" ]] || usage

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

DEPLOY_API="$(resolve_script deploy-api.sh)"
PHASE8="$(resolve_script phase8-release-deploy-prod-shadow.sh)"
VERIFY_PUBLIC="$(resolve_script verify-production-public-api.sh)"
CHECK_PROD="$(resolve_script check-production-env-ready.sh)"

echo "=== deploy-production-public-api image=${IMAGE} ==="
echo "NOTE: :3001 (api.env) and :3002 (api.env.production) remain separate — no env merge."

bash "$CHECK_PROD"

echo ">> [1/3] deploy-api.sh — :3001 main container (unchanged role)"
DEPLOY_ARGS=(--image "$IMAGE")
[[ "$SKIP_PULL" -eq 1 ]] && DEPLOY_ARGS+=(--skip-pull)
bash "$DEPLOY_API" "${DEPLOY_ARGS[@]}"

echo ">> [2/3] phase8-release-deploy-prod-shadow.sh — :3002 public upstream"
SOUQ_PROD_IMAGE="$IMAGE" bash "$PHASE8"

echo ">> [3/3] verify-production-public-api.sh — public URL gate"
SOUQ_EXPECT_IMAGE="$IMAGE" bash "$VERIFY_PUBLIC" "$IMAGE"

echo "OK deploy-production-public-api ${IMAGE}"

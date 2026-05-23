#!/usr/bin/env bash
# Phase 6 — forgot-password with registered smoke email (no secret output).
set -u
CONFIG="${SOUQ_ENV_FILE:-/opt/souq-arab/config/api.env.production}"
BASE="${API_BASE:-https://api.souq-arab.com}"

read_env() {
  grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true
}

SE="$(read_env PROD_SMOKE_EMAIL)"
[[ -z "${SE:-}" ]] && SE="$(read_env STAGING_SMOKE_EMAIL)"

if [[ -z "${SE:-}" ]]; then
  echo "SKIP no smoke email in ${CONFIG}"
  exit 2
fi

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

python3 -c "import json,sys; json.dump({'email': sys.argv[2]}, open(sys.argv[1],'w'))" \
  "$BODY_FILE" "$SE"

echo "=== forgot-password existing user (public) ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: souq-phase6-forgot-test" \
  --data-binary @"$BODY_FILE" \
  "${BASE}/api/auth/forgot-password"

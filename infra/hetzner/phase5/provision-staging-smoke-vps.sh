#!/usr/bin/env bash
# STAGING only: dedicated smoke user + STAGING_SMOKE_* on api.env.staging (no secret output).
set -euo pipefail
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
ENV_FILE="/opt/souq-arab/config/api.env.staging"
CONTAINER="${SOUQ_API_CONTAINER:-souq-arab-api-api-1}"
SCRIPT="/opt/souq-arab/scripts/provision-prod-smoke-inner.cjs"

read_env_key() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}
EMAIL="${STAGING_SMOKE_EMAIL:-$(read_env_key STAGING_SMOKE_EMAIL)}"
[[ -z "${EMAIL:-}" ]] && EMAIL="souq-staging-smoke-vps@example.com"

grep -q "$STAGING_REF" "$ENV_FILE" || { echo "REFUSE: staging ref missing"; exit 1; }
grep -q "$PROD_REF" "$ENV_FILE" && { echo "REFUSE: production ref in staging env"; exit 1; }
[[ -f "$SCRIPT" ]] || { echo "FAIL: missing $SCRIPT"; exit 1; }

PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

docker cp "$SCRIPT" "${CONTAINER}:/app/provision-staging-smoke-inner.cjs" >/dev/null
err=$(docker exec -w /app -e SMOKE_EMAIL="$EMAIL" -e SMOKE_PASS="$PASS" "$CONTAINER" \
  node /app/provision-staging-smoke-inner.cjs 2>&1) || {
  echo "$err" | sed -E 's/(postgresql|postgres)([^[:space:]]*)/[REDACTED_DB]/gi' | grep -v REDACTED | head -5
  echo "FAIL: container provision"
  exit 1
}
echo "$err" | grep -q OK_USER || { echo "FAIL: container provision (no OK_USER)"; exit 1; }

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
grep -vE '^(STAGING_SMOKE_EMAIL|STAGING_SMOKE_PASSWORD)=' "$ENV_FILE" >"$tmp" || true
printf '%s\n' "STAGING_SMOKE_EMAIL=${EMAIL}" "STAGING_SMOKE_PASSWORD=${PASS}" >>"$tmp"
sudo install -m 600 -o deploy -g deploy "$tmp" "$ENV_FILE"
echo "OK_STAGING_SMOKE_KEYS_SET"

#!/usr/bin/env bash
# PRODUCTION only: dedicated smoke user + PROD_SMOKE_* on api.env.production (no secret output).
set -euo pipefail
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
ENV_FILE="/opt/souq-arab/config/api.env.production"
EMAIL="${PROD_SMOKE_EMAIL:-souq-prod-smoke-vps@example.com}"
CONTAINER="${SOUQ_API_CONTAINER:-souq-arab-api-api-1}"
SCRIPT="/opt/souq-arab/scripts/provision-prod-smoke-inner.cjs"

grep -q "$PROD_REF" "$ENV_FILE" || { echo "REFUSE: production ref missing"; exit 1; }
grep -q "$STAGING_REF" "$ENV_FILE" && { echo "REFUSE: staging ref in production env"; exit 1; }
[[ -f "$SCRIPT" ]] || { echo "FAIL: missing $SCRIPT"; exit 1; }

PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

docker cp "$SCRIPT" "${CONTAINER}:/app/provision-prod-smoke-inner.cjs" >/dev/null
err=$(docker exec -w /app -e SMOKE_EMAIL="$EMAIL" -e SMOKE_PASS="$PASS" "$CONTAINER" \
  node /app/provision-prod-smoke-inner.cjs 2>&1) || {
  echo "$err" | sed -E 's/(postgresql|postgres)([^[:space:]]*)/[REDACTED_DB]/gi' | grep -v REDACTED | head -5
  echo "FAIL: container provision"
  exit 1
}
echo "$err" | grep -q OK_USER || { echo "FAIL: container provision (no OK_USER)"; exit 1; }

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
grep -vE '^(PROD_SMOKE_EMAIL|PROD_SMOKE_PASSWORD)=' "$ENV_FILE" >"$tmp" || true
printf '%s\n' "PROD_SMOKE_EMAIL=${EMAIL}" "PROD_SMOKE_PASSWORD=${PASS}" >>"$tmp"
install -m 600 "$tmp" "$ENV_FILE"
chown deploy:deploy "$ENV_FILE" 2>/dev/null || true
echo "OK_PROD_SMOKE_KEYS_SET"

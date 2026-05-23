#!/usr/bin/env bash
# Read-only: validate STAGING storage env on VPS without printing secrets.
set -u
ENV_FILE="${1:-/opt/souq-arab/config/api.env.staging}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== VPS storage env check (no secrets) ==="

[[ -f "$ENV_FILE" ]] || { bad "env file missing"; exit 1; }

BUCKET=$(grep -E '^SUPABASE_UPLOADS_BUCKET=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r')
URL=$(grep -E '^SUPABASE_URL=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r')
KEY_SET=0
grep -qE '^SUPABASE_SERVICE_ROLE_KEY=.+$' "$ENV_FILE" 2>/dev/null && KEY_SET=1

[[ -n "${BUCKET:-}" ]] && ok "bucket name set (${BUCKET})" || bad "SUPABASE_UPLOADS_BUCKET empty"
[[ -n "${URL:-}" ]] && ok "SUPABASE_URL set" || bad "SUPABASE_URL empty"
[[ "$KEY_SET" -eq 1 ]] && ok "SUPABASE_SERVICE_ROLE_KEY present" || bad "SUPABASE_SERVICE_ROLE_KEY missing"

if [[ "$KEY_SET" -eq 1 && -n "${URL:-}" ]]; then
  ROLE_SCRIPT="/opt/souq-arab/scripts/verify-staging-key-role.py"
  if [[ -f "$ROLE_SCRIPT" ]]; then
    ROLE_LINE=$(python3 "$ROLE_SCRIPT" "$ENV_FILE" 2>/dev/null || echo "role=decode_error")
    ROLE="${ROLE_LINE#role=}"
    ROLE="${ROLE%% *}"
    [[ "$ROLE" == "service_role" ]] && ok "JWT role is service_role" || bad "JWT role is ${ROLE} (expected service_role)"
  else
    bad "verify-staging-key-role.py missing on VPS"
  fi
fi

echo "$URL" | grep -q 'qkczposlooaldmsjfmun' && ok "STAGING ref in SUPABASE_URL" || bad "STAGING ref missing in URL"
echo "$URL" | grep -q 'nptfxtkedqndkgmrcntn' && bad "PRODUCTION ref in staging env" || ok "no production ref in URL"

if [[ "$BUCKET" == "uploads-staging" ]]; then
  ok "bucket matches STAGING convention (uploads-staging)"
else
  bad "bucket is ${BUCKET}; expected uploads-staging on STAGING VPS"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== VPS storage env check: PASS ===" && exit 0
echo "=== VPS storage env check: FAIL ==="
exit 1

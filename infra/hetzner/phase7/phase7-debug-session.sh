#!/usr/bin/env bash
set -u
CONFIG="/opt/souq-arab/config/api.env.production"
read_env_key() { grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
HDR=$(mktemp)
trap 'rm -f "$HDR"' EXIT
BODY=$(mktemp)
trap 'rm -f "$HDR" "$BODY"' EXIT
code=$(curl -s -D "$HDR" -o "$BODY" -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H 'X-Forwarded-Proto: https' \
  -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" "${BASE:-http://127.0.0.1}/api/auth/login")
echo "login_http:${code}"
grep -q '"error"' "$BODY" 2>/dev/null && echo "login_body_has_error" || echo "login_body_ok_shape"
grep -i '^set-cookie' "$HDR" | sed 's/=.*/=***redacted***/' | head -2
grep -qi souq.sid "$HDR" && echo cookie_line_present || echo cookie_line_missing

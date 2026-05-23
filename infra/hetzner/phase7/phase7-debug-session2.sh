#!/usr/bin/env bash
set -u
CONFIG="/opt/souq-arab/config/api.env.production"
read_env_key() { grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
OUT=/tmp/login-hdr-debug.txt
curl -s -D "$OUT" -o /tmp/login-body-debug.json -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-Forwarded-Proto: https' \
  -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" \
  "${TARGET:-http://127.0.0.1:3001}/api/auth/login"
echo "lines:$(wc -l <"$OUT")"
grep -ci 'set-cookie' "$OUT" || true
grep -i '^set-cookie:' "$OUT" | sed 's/=.*/=REDACTED/;s/;.*//' | head -1
grep -q '"id"' /tmp/login-body-debug.json 2>/dev/null && echo body_has_user_id || echo body_no_user_id
grep -q '"error"' /tmp/login-body-debug.json 2>/dev/null && echo body_has_error || true
rm -f "$OUT" /tmp/login-body-debug.json

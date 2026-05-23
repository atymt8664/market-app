#!/usr/bin/env bash
# WebSocket probe on production path (nginx -> :3002). No secret output.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
CONFIG="/opt/souq-arab/config/api.env.production"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 3 production WebSocket probe ==="

read_env_key() { grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
[[ -z "$SE" ]] && SE="$(read_env_key STAGING_SMOKE_EMAIL)"
[[ -z "$SP" ]] && SP="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -z "${SE:-}" || -z "${SP:-}" ]]; then
  bad "smoke creds missing in api.env.production"
  echo "=== PHASE 3 WS: FAIL ==="
  exit 1
fi

command -v websocat >/dev/null 2>&1 || { bad "websocat missing"; exit 1; }

JAR=$(mktemp)
HDR=$(mktemp)
trap 'rm -f "$JAR" "$HDR"' EXIT
c=000
for _attempt in 1 2 3; do
  c=$(curl -s -D "$HDR" -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'X-Forwarded-Proto: https' -H 'Content-Type: application/json' -H 'User-Agent: souq-phase3-ws' \
    -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" \
    "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && break
  [[ "$c" == "429" ]] && sleep 45
done
[[ "$c" == "200" ]] && ok "login (${c})" || { bad "login (${c})"; exit 1; }

COOKIE="$(grep -i '^set-cookie:.*souq\.sid' "$HDR" 2>/dev/null | head -1 | sed 's/^[Ss]et-[Cc]ookie: *//; s/;.*//')"
[[ -z "${COOKIE:-}" ]] && COOKIE="$(awk '$6=="souq.sid" {print $6"="$7; exit}' "$JAR" 2>/dev/null)"
[[ -n "${COOKIE:-}" ]] && ok "session cookie" || { bad "cookie"; exit 1; }

WS_HOST="${BASE#http://}"
WS_HOST="${WS_HOST#https://}"
WS_URL="ws://${WS_HOST}/api/ws"

REPLY=$(printf '{"type":"ping"}\n' | timeout 5 websocat -n1 --header="Cookie: ${COOKIE}" "$WS_URL" 2>/dev/null | head -1 || true)
echo "$REPLY" | grep -qE '"type":"pong"|pong' && ok "ping/pong via nginx" || bad "ws via nginx"

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 3 WS: PASS ===" && exit 0
echo "=== PHASE 3 WS: FAIL ==="
exit 1

#!/usr/bin/env bash
# Post-cutover E2E on VPS production API (loopback or public base) — no secret output.
set -u
BASE="${API_BASE:-http://127.0.0.1:3001}"
CONFIG="${SOUQ_ENV_FILE:-/opt/souq-arab/config/api.env.production}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
skip() { printf '  SKIP %s\n' "$*"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

HDR_HTTPS=(-H 'X-Forwarded-Proto: https')

echo "=== Phase 7 post-cutover E2E ==="

read_env_key() { grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
[[ -z "$SE" ]] && SE="$(read_env_key STAGING_SMOKE_EMAIL)"
[[ -z "$SP" ]] && SP="$(read_env_key STAGING_SMOKE_PASSWORD)"
[[ -z "$SE" || -z "$SP" ]] && { skip "auth E2E (set PROD_SMOKE_* or STAGING_SMOKE_* in api.env.production)"; echo "=== E2E: SKIP (no smoke creds) ==="; exit 0; }

JAR=$(mktemp)
HDR=$(mktemp)
trap 'rm -f "$JAR" "$HDR"' EXIT

c=000
for _attempt in 1 2 3; do
  c=$(curl -s -D "$HDR" -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    "${HDR_HTTPS[@]}" -H 'Content-Type: application/json' -H 'User-Agent: souq-phase7-e2e' \
    -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && break
  [[ "$c" == "429" ]] && sleep 45
done
[[ "$c" == "200" ]] && ok "login ($c)" || { bad "login ($c)"; echo "=== E2E: FAIL ==="; exit 1; }

COOKIE_HDR="$(grep -i '^set-cookie:.*souq\.sid' "$HDR" 2>/dev/null | head -1 | sed 's/^[Ss]et-[Cc]ookie: *//; s/;.*//')"
[[ -z "${COOKIE_HDR:-}" ]] && COOKIE_HDR="$(awk '$6=="souq.sid" {print $6"="$7; exit}' "$JAR" 2>/dev/null)"
AUTH=()
[[ -n "${COOKIE_HDR:-}" ]] && AUTH=(-H "Cookie: ${COOKIE_HDR}")

c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/auth/me"); [[ "$c" == "200" ]] && ok "auth/me ($c)" || bad "auth/me ($c)"
c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/auth/me"); [[ "$c" == "200" ]] && ok "session persist ($c)" || bad "session ($c)"
c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/ads/favorites"); [[ "$c" == "200" ]] && ok "favorites ($c)" || bad "favorites ($c)"
c=$(code "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/conversations"); [[ "$c" == "200" ]] && ok "conversations ($c)" || bad "conversations ($c)"

CSRF="$(curl -s "${HDR_HTTPS[@]}" -b "$JAR" -c "$JAR" "${AUTH[@]}" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1)"
if [[ -n "${CSRF:-}" ]]; then
  c=$(code "${HDR_HTTPS[@]}" "${AUTH[@]}" -X POST -H "x-csrf-token: ${CSRF}" -H 'Content-Type: application/json' -d '{}' "${BASE}/api/storage/uploads/ad-images")
  [[ "$c" == "400" || "$c" == "415" ]] && ok "upload route authed ($c)" || bad "upload ($c)"
fi

if [[ -n "${COOKIE_HDR:-}" ]] && command -v websocat >/dev/null 2>&1; then
  _ws_base="${BASE#http://}"
  _ws_base="${_ws_base#https://}"
  WS_HOST="${WS_URL:-ws://${_ws_base}/api/ws}"
  R=$(printf '{"type":"ping"}\n' | timeout 5 websocat -n1 --header="Cookie: ${COOKIE_HDR}" "$WS_HOST" 2>/dev/null | head -1)
  echo "$R" | grep -q pong && ok "websocket ping/pong" || bad "websocket"
else
  skip "websocket (websocat or cookie)"
fi

if [[ -n "${CSRF:-}" ]]; then
  c=$(code "${HDR_HTTPS[@]}" "${AUTH[@]}" -X POST -H "x-csrf-token: ${CSRF}" "${BASE}/api/auth/logout")
  [[ "$c" == "200" || "$c" == "204" ]] && ok "logout ($c)" || bad "logout ($c)"
else
  bad "logout (csrf missing)"
fi
c=$(code "${HDR_HTTPS[@]}" "${AUTH[@]}" "${BASE}/api/auth/me"); [[ "$c" == "401" ]] && ok "post-logout me ($c)" || bad "post-logout me ($c)"

c=$(code "${BASE}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "admin/me read-only guard ($c)" || bad "admin/me ($c)"

[[ "$FAIL" -eq 0 ]] && echo "=== E2E: PASS ===" && exit 0
echo "=== E2E: FAIL ==="
exit 1

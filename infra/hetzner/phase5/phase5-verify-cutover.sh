#!/usr/bin/env bash
# Phase 5 — full cutover verification on public API base (HTTPS expected). No secret output.
set -u
BASE="${API_BASE:-https://api.souq-arab.com}"
CONFIG="${SOUQ_ENV_FILE:-/opt/souq-arab/config/api.env.production}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
skip() { printf '  SKIP %s\n' "$*"; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase5-verify' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 5 cutover verify (${BASE}) ==="

[[ "$BASE" == https://* ]] || bad "API_BASE must be HTTPS in phase 5"
c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "healthz (${c})" || bad "healthz (${c})"
c=$(code "${BASE}/api/livez"); [[ "$c" == "200" ]] && ok "livez (${c})" || bad "livez (${c})"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "readyz (${c})" || bad "readyz (${c})"
c=$(code "${BASE}/api/categories"); [[ "$c" == "200" ]] && ok "categories (${c})" || bad "categories (${c})"
c=$(code "${BASE}/api/ads?limit=5"); [[ "$c" == "200" ]] && ok "ads (${c})" || bad "ads (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/reports"); [[ "$c" == "401" || "$c" == "403" ]] && ok "reports (${c})" || bad "reports (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/support/tickets"); [[ "$c" == "401" || "$c" == "403" ]] && ok "support (${c})" || bad "support (${c})"
c=$(code "${BASE}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "admin/me unauth (${c})" || bad "admin/me (${c})"

read_env_key() { grep -E "^${1}=" "$CONFIG" 2>/dev/null | head -1 | cut -d= -f2- || true; }
SE="$(read_env_key PROD_SMOKE_EMAIL)"
SP="$(read_env_key PROD_SMOKE_PASSWORD)"
[[ -z "$SE" ]] && SE="$(read_env_key STAGING_SMOKE_EMAIL)"
[[ -z "$SP" ]] && SP="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -n "${SE:-}" && -n "${SP:-}" ]]; then
  JAR=$(mktemp)
  c=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' -H 'User-Agent: souq-phase5-verify' \
    -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && ok "login (${c})" || bad "login (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/auth/me"); [[ "$c" == "200" ]] && ok "auth/me (${c})" || bad "auth/me (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/auth/me"); [[ "$c" == "200" ]] && ok "session persist (${c})" || bad "session (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/ads/favorites"); [[ "$c" == "200" ]] && ok "favorites (${c})" || bad "favorites (${c})"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/conversations"); [[ "$c" == "200" ]] && ok "messages/conversations (${c})" || bad "conversations (${c})"
  CSRF="$(curl -s -b "$JAR" -c "$JAR" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -n "${CSRF:-}" ]]; then
    c=$(code -b "$JAR" -c "$JAR" -X POST -H "x-csrf-token: ${CSRF}" -H 'Content-Type: application/json' -d '{}' "${BASE}/api/storage/uploads/ad-images")
    [[ "$c" == "400" || "$c" == "415" || "$c" == "422" ]] && ok "upload route (${c})" || bad "upload (${c})"
  else
    bad "upload (csrf missing)"
  fi
  if command -v websocat >/dev/null 2>&1; then
    COOKIE="$(grep $'\t'souq.sid$'\t' "$JAR" 2>/dev/null | awk -F'\t' '{print $6"="$7}' | tail -1)"
    if [[ -z "${COOKIE:-}" ]]; then
      COOKIE="$(grep '^#HttpOnly' "$JAR" 2>/dev/null | grep $'\t'souq.sid$'\t' | awk -F'\t' '{print $6"="$7}' | tail -1)"
    fi
  if [[ "$BASE" == https://* ]]; then
    WS_URL="wss://${BASE#https://}/api/ws"
  else
    WS_URL="ws://${BASE#*://}/api/ws"
  fi
    REPLY=$(printf '{"type":"ping"}\n' | timeout 5 websocat -n1 --header="Cookie: ${COOKIE}" "$WS_URL" 2>/dev/null | head -1 || true)
    if echo "$REPLY" | grep -q '"type":"pong"'; then
      ok "WebSocket ping/pong"
    else
      bad "WebSocket"
    fi
  else
    skip "WebSocket (websocat not installed)"
  fi
  rm -f "$JAR"
else
  skip "login/session/favorites/ws (set PROD_SMOKE_* in api.env.production)"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== PHASE 5 VERIFY: PASS ==="
  exit 0
fi
echo "=== PHASE 5 VERIFY: FAIL ==="
exit 1

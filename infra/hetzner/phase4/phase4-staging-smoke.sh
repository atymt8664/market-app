#!/usr/bin/env bash
# STAGING shadow smoke — no secrets in output.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 4 STAGING smoke ==="

c=$(code "${BASE}/healthz"); [[ "$c" == "200" ]] && ok "host /healthz" || bad "host /healthz ($c)"
c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "/api/healthz" || bad "/api/healthz ($c)"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "/api/readyz ($c)" || bad "/api/readyz ($c)"
c=$(code "${BASE}/api/categories"); [[ "$c" == "200" ]] && ok "GET /api/categories" || bad "categories ($c)"

# Session login (optional credentials on VPS only)
read_env_key() {
  grep -E "^${1}=" /opt/souq-arab/config/api.env.staging 2>/dev/null | head -1 | cut -d= -f2- || true
}
STAGING_SMOKE_EMAIL="$(read_env_key STAGING_SMOKE_EMAIL)"
STAGING_SMOKE_PASSWORD="$(read_env_key STAGING_SMOKE_PASSWORD)"

if [[ -n "${STAGING_SMOKE_EMAIL:-}" && -n "${STAGING_SMOKE_PASSWORD:-}" ]]; then
  JAR=$(mktemp)
  c=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' -H 'User-Agent: souq-staging-smoke' \
    -d "{\"email\":\"${STAGING_SMOKE_EMAIL}\",\"password\":\"${STAGING_SMOKE_PASSWORD}\"}" \
    "${BASE}/api/auth/login" 2>/dev/null || echo 000)
  [[ "$c" == "200" ]] && ok "POST /api/auth/login" || bad "login ($c)"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/auth/me")
  [[ "$c" == "200" ]] && ok "GET /api/auth/me" || bad "auth/me ($c)"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/auth/me")
  [[ "$c" == "200" ]] && ok "session persisted (auth/me)" || bad "session ($c)"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/ads?limit=3")
  [[ "$c" == "200" ]] && ok "GET /api/ads" || bad "ads ($c)"
  c=$(code -b "$JAR" -c "$JAR" "${BASE}/api/ads/favorites")
  [[ "$c" == "200" ]] && ok "GET /api/ads/favorites" || bad "favorites ($c)"
  CSRF="$(curl -s -b "$JAR" -c "$JAR" "${BASE}/api/auth/me" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p' | head -1)"
  if [[ -n "${CSRF:-}" ]]; then
    c=$(code -b "$JAR" -c "$JAR" -X POST -H 'Content-Type: application/json' -H "x-csrf-token: ${CSRF}" -d '{}' "${BASE}/api/storage/uploads/ad-images")
    [[ "$c" == "400" || "$c" == "415" || "$c" == "422" ]] && ok "POST upload authed (no files: $c)" || bad "upload authed ($c)"
  else
    bad "upload authed (csrf missing from auth/me)"
  fi
  # WebSocket probe reuses the same session (avoids duplicate login → 429 under rate limits)
  if [[ -x /opt/souq-arab/scripts/phase5-ws-probe.sh ]]; then
    if SOUQ_SMOKE_COOKIE_JAR="$JAR" /opt/souq-arab/scripts/phase5-ws-probe.sh 2>/dev/null | grep -q 'WS PROBE: PASS'; then
      ok "WebSocket /api/ws (authed ping/pong)"
    else
      bad "WebSocket /api/ws"
    fi
  fi
  rm -f "$JAR"
else
  ok "login/session/ads skipped (set STAGING_SMOKE_EMAIL/PASSWORD in api.env.staging on VPS)"
fi

# WebSocket without smoke credentials (unauthenticated block only)
if [[ -z "${STAGING_SMOKE_EMAIL:-}" || -z "${STAGING_SMOKE_PASSWORD:-}" ]] \
  && command -v websocat >/dev/null 2>&1; then
  if ! printf '\n' | timeout 2 websocat -n1 'ws://127.0.0.1/api/ws' 2>/dev/null | grep -q .; then
    ok "WebSocket unauthenticated blocked"
  else
    bad "WebSocket /api/ws"
  fi
else
  ok "WebSocket skipped (websocat not installed)"
fi

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/support/tickets")
[[ "$c" == "401" || "$c" == "403" ]] && ok "POST /api/support/tickets ($c)" || bad "support ($c)"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/reports")
[[ "$c" == "401" || "$c" == "403" ]] && ok "POST /api/reports ($c)" || bad "reports ($c)"
c=$(code "${BASE}/api/admin/me")
[[ "$c" == "401" || "$c" == "403" ]] && ok "GET /api/admin/me unauthenticated ($c)" || bad "admin/me ($c)"

if docker compose -f /opt/souq-arab/api/docker/docker-compose.yml ps 2>/dev/null | grep -q 'api-1.*Up'; then
  ok "staging shadow api container running"
else
  bad "api container not running"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== SMOKE: PASS ==="
  exit 0
fi
echo "=== SMOKE: FAIL ==="
exit 1

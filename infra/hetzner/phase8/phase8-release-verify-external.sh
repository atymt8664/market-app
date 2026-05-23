#!/usr/bin/env bash
# Phase 8 curated release — external production smoke (no secrets logged).
set -u
BASE="${API_BASE:-https://api.souq-arab.com}"
WWW="${WWW_BASE:-https://www.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase8-release' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 8 external release verify (${BASE}) ==="

c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "healthz (${c})" || bad "healthz (${c})"
c=$(code "${BASE}/api/livez"); [[ "$c" == "200" ]] && ok "livez (${c})" || bad "livez (${c})"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "readyz (${c})" || bad "readyz (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"phase8-nonexist@example.com"}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "200" || "$c" == "429" ]] && ok "forgot-password (${c})" || bad "forgot-password (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "400" || "$c" == "429" ]] && ok "forgot validation (${c})" || bad "forgot validation (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"token":"x","password":"weak"}' "${BASE}/api/auth/reset-password")
[[ "$c" == "400" || "$c" == "429" ]] && ok "reset-password (${c})" || bad "reset-password (${c})"

c=$(code "${BASE}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "admin guard (${c})" || bad "admin guard (${c})"

c=$(code "${WWW}/"); [[ "$c" == "200" ]] && ok "home (${c})" || bad "home (${c})"
c=$(code "${WWW}/favorites"); [[ "$c" == "200" ]] && ok "favorites page (${c})" || bad "favorites page (${c})"
c=$(code "${WWW}/search"); [[ "$c" == "200" ]] && ok "search page (${c})" || bad "search page (${c})"
c=$(code "${WWW}/new"); [[ "$c" == "200" ]] && ok "create-ad page (${c})" || bad "create-ad page (${c})"

c=$(code -H 'Connection: Upgrade' -H 'Upgrade: websocket' "${BASE}/api/ws")
[[ "$c" == "401" || "$c" == "426" ]] && ok "websocket endpoint (${c})" || bad "websocket endpoint (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 8 EXTERNAL VERIFY: PASS ===" && exit 0
echo "=== PHASE 8 EXTERNAL VERIFY: FAIL ==="
exit 1

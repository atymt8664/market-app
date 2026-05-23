#!/usr/bin/env bash
# Read-only smoke for VPS production shadow (127.0.0.1:3002) — no secrets.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase7-shadow-ro' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 7 VPS production API read-only ==="

c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "healthz (${c})" || bad "healthz (${c})"
c=$(code "${BASE}/api/livez"); [[ "$c" == "200" ]] && ok "livez (${c})" || bad "livez (${c})"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "readyz (${c})" || bad "readyz (${c})"
c=$(code "${BASE}/api/categories"); [[ "$c" == "200" ]] && ok "categories (${c})" || bad "categories (${c})"
c=$(code "${BASE}/api/ads?limit=5"); [[ "$c" == "200" ]] && ok "ads (${c})" || bad "ads (${c})"
c=$(code "${BASE}/api/ads/featured"); [[ "$c" == "200" ]] && ok "featured (${c})" || bad "featured (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/reports"); [[ "$c" == "401" || "$c" == "403" ]] && ok "reports (${c})" || bad "reports (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/support/tickets"); [[ "$c" == "401" || "$c" == "403" ]] && ok "support (${c})" || bad "support (${c})"
c=$(code "${BASE}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "admin/me (${c})" || bad "admin/me (${c})"
c=$(code "${BASE}/api/conversations"); [[ "$c" == "401" || "$c" == "403" ]] && ok "conversations (${c})" || bad "conversations (${c})"
c=$(code "${BASE}/api/ads/favorites"); [[ "$c" == "401" || "$c" == "403" ]] && ok "favorites (${c})" || bad "favorites (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== PROD SHADOW READONLY: PASS ===" && exit 0
echo "=== PROD SHADOW READONLY: FAIL ==="
exit 1

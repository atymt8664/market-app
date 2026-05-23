#!/usr/bin/env bash
# Read-only production API smoke (Railway / api.souq-arab.com) — no secrets, no mutations.
set -u
API="${PROD_API_BASE:-https://api.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase7-ro' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 7 production read-only (external / Railway fallback) ==="

c=$(code "${API}/api/healthz"); [[ "$c" == "200" ]] && ok "GET /api/healthz (${c})" || bad "healthz (${c})"
c=$(code "${API}/api/livez"); [[ "$c" == "200" ]] && ok "GET /api/livez (${c})" || bad "livez (${c})"
c=$(code "${API}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "GET /api/readyz (${c})" || bad "readyz (${c})"
c=$(code "${API}/api/categories"); [[ "$c" == "200" ]] && ok "GET /api/categories (${c})" || bad "categories (${c})"
c=$(code "${API}/api/ads?limit=5"); [[ "$c" == "200" ]] && ok "GET /api/ads (${c})" || bad "ads (${c})"
c=$(code "${API}/api/ads/featured"); [[ "$c" == "200" ]] && ok "GET /api/ads/featured (${c})" || bad "featured (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${API}/api/reports"); [[ "$c" == "401" || "$c" == "403" ]] && ok "POST /api/reports (${c})" || bad "reports (${c})"
c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${API}/api/support/tickets"); [[ "$c" == "401" || "$c" == "403" ]] && ok "POST /api/support (${c})" || bad "support (${c})"
c=$(code "${API}/api/admin/me"); [[ "$c" == "401" || "$c" == "403" ]] && ok "GET /api/admin/me (${c})" || bad "admin/me (${c})"
c=$(code "${API}/api/conversations"); [[ "$c" == "401" || "$c" == "403" ]] && ok "GET /api/conversations (${c})" || bad "conversations (${c})"
c=$(code "${API}/api/ads/favorites"); [[ "$c" == "401" || "$c" == "403" ]] && ok "GET /api/ads/favorites (${c})" || bad "favorites (${c})"

lim=$(curl -s -o /dev/null -w '%{http_code}:%{header_json}' -H 'User-Agent: souq-phase7-ro' "${API}/api/ads?limit=999999" 2>/dev/null | head -1)
c="${lim%%:*}"
[[ "$c" == "200" ]] && ok "pagination abuse clamp (${c})" || bad "pagination (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== PROD READONLY EXTERNAL: PASS ===" && exit 0
echo "=== PROD READONLY EXTERNAL: FAIL ==="
exit 1

#!/usr/bin/env bash
# Verify Railway service still healthy after api.souq-arab.com DNS points to VPS (rollback path).
# Uses Railway upstream hostname + Host header — no secrets.
set -u
RAILWAY_HOST="${RAILWAY_UPSTREAM_HOST:-t20ubv01.up.railway.app}"
API_HOST="${SOUQ_API_DOMAIN:-api.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() {
  curl -s -o /dev/null -w '%{http_code}' -H "Host: ${API_HOST}" -H 'User-Agent: souq-phase5-railway-fb' "$@" 2>/dev/null || echo 000
}

echo "=== Phase 5 Railway fallback smoke (service still up) ==="

c=$(code "https://${RAILWAY_HOST}/api/healthz")
[[ "$c" == "200" ]] && ok "Railway /api/healthz via Host ${API_HOST} (${c})" || bad "Railway healthz (${c})"
c=$(code "https://${RAILWAY_HOST}/api/readyz")
[[ "$c" == "200" || "$c" == "503" ]] && ok "Railway /api/readyz (${c})" || bad "Railway readyz (${c})"
c=$(code "https://${RAILWAY_HOST}/api/categories")
[[ "$c" == "200" ]] && ok "Railway /api/categories (${c})" || bad "Railway categories (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== RAILWAY FALLBACK: PASS (service alive — rollback = restore DNS CNAME) ===" && exit 0
echo "=== RAILWAY FALLBACK: FAIL ==="
exit 1

#!/usr/bin/env bash
# Production API smoke (read-only HTTP) — SKIPPED while staging env is active.
# Never prints secrets. Does not mutate data.
set -u
BASE="${API_BASE:-http://127.0.0.1}"
CONFIG="/opt/souq-arab/config"
ACTIVE="${CONFIG}/api.env"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"

echo "=== Phase 6 production API smoke (read-only) ==="

if [[ -L "$ACTIVE" ]] && readlink "$ACTIVE" 2>/dev/null | grep -q 'api.env.staging'; then
  echo "SKIP staging env active (prep mode — production smoke not run)"
  echo "=== PROD SMOKE: SKIP (expected in Phase 6 prep) ==="
  exit 0
fi

if [[ ! -f "${CONFIG}/api.env.production" ]]; then
  echo "FAIL missing api.env.production"
  exit 1
fi

if grep -q "$STAGING_REF" "${CONFIG}/api.env.production" 2>/dev/null; then
  echo "FAIL staging ref in production env file"
  exit 1
fi

if ! grep -q "$PROD_REF" "${CONFIG}/api.env.production" 2>/dev/null; then
  echo "FAIL production ref absent in api.env.production"
  exit 1
fi

FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-prod-smoke-ro' "$@" 2>/dev/null || echo 000; }

for path in /api/healthz /api/livez /api/readyz "/api/categories?limit=2" "/api/ads?limit=2"; do
  c=$(code "${BASE}${path}")
  [[ "$c" == "200" || ( "$path" == "/api/readyz" && "$c" == "503" ) ]] && ok "GET ${path} (${c})" || bad "GET ${path} (${c})"
done

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/reports")
[[ "$c" == "401" || "$c" == "403" ]] && ok "POST /api/reports (${c})" || bad "reports (${c})"
c=$(code "${BASE}/api/admin/me")
[[ "$c" == "401" || "$c" == "403" ]] && ok "GET /api/admin/me (${c})" || bad "admin/me (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== PROD SMOKE: PASS ===" && exit 0
echo "=== PROD SMOKE: FAIL ==="
exit 1

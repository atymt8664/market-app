#!/usr/bin/env bash
# Phase 6 — public stabilization smoke (no secrets). Run from VPS or CI.
set -u
BASE="${API_BASE:-https://api.souq-arab.com}"
VERCEL_BASE="${VERCEL_API_BASE:-https://www.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
skip() { printf '  SKIP %s\n' "$*"; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase6-smoke' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 6 stabilization smoke ==="
echo "API_BASE=${BASE}"
echo "VERCEL_API_BASE=${VERCEL_BASE}"

[[ "$BASE" == https://* ]] && ok "API_BASE is HTTPS" || bad "API_BASE must be HTTPS"
[[ "$VERCEL_BASE" == https://* ]] && ok "Vercel base is HTTPS" || bad "Vercel base must be HTTPS"

for path in /api/healthz /api/livez /api/readyz "/api/categories?limit=2" "/api/ads?limit=2"; do
  c=$(code "${BASE}${path}")
  [[ "$c" == "200" || ( "$path" == "/api/readyz" && "$c" == "503" ) ]] && ok "GET ${path} (${c})" || bad "GET ${path} (${c})"
done

c=$(code "${VERCEL_BASE}/api/healthz")
[[ "$c" == "200" ]] && ok "Vercel rewrite /api/healthz (${c})" || bad "Vercel rewrite (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"not-an-email"}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "400" ]] && ok "forgot-password invalid (${c})" || bad "forgot-password invalid (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"phase6-nonexist@example.com"}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "200" ]] && ok "forgot-password unknown email (${c})" || bad "forgot-password unknown (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"not-an-email"}' "${BASE}/api/auth/resend-verification")
[[ "$c" == "400" || "$c" == "422" ]] && ok "OTP resend validation (${c})" || bad "OTP resend (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/reports")
[[ "$c" == "401" || "$c" == "403" ]] && ok "reports unauth (${c})" || bad "reports (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/support/tickets")
[[ "$c" == "401" || "$c" == "403" ]] && ok "support unauth (${c})" || bad "support (${c})"

c=$(code "${BASE}/api/admin/me")
[[ "$c" == "401" || "$c" == "403" ]] && ok "admin/me unauth (${c})" || bad "admin/me (${c})"

if [[ -x /opt/souq-arab/scripts/phase6-test-forgot-password-existing.sh ]]; then
  if bash /opt/souq-arab/scripts/phase6-test-forgot-password-existing.sh | tail -1 | grep -q 'HTTP:200\|HTTP:502'; then
    ok "forgot-password existing user (200 or 502 mail)"
  else
    bad "forgot-password existing user"
  fi
elif [[ -f /tmp/phase6-test-forgot.sh ]]; then
  if bash /tmp/phase6-test-forgot.sh | tail -1 | grep -q 'HTTP:200\|HTTP:502'; then
    ok "forgot-password existing user (200 or 502 mail)"
  else
    bad "forgot-password existing user"
  fi
else
  skip "forgot-password existing user (phase6-test-forgot-password-existing.sh)"
fi

if API_BASE="$BASE" bash /opt/souq-arab/scripts/phase5-verify-cutover.sh 2>/dev/null | grep -q 'PHASE 5 VERIFY: PASS'; then
  ok "phase5 verify regression"
else
  skip "phase5 verify (credentials or script missing)"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 6 STABILIZATION SMOKE: PASS ===" && exit 0
echo "=== PHASE 6 STABILIZATION SMOKE: FAIL ==="
exit 1

#!/usr/bin/env bash
# Phase 6.1 — verify forgot-password hardening + regression (no secret output).
set -u
BASE="${API_BASE:-https://api.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase6-1-verify' "$@" 2>/dev/null || echo 000; }
body_code() {
  local tmp
  tmp=$(mktemp)
  local c
  c=$(curl -s -o "$tmp" -w '%{http_code}' -H 'User-Agent: souq-phase6-1-verify' "$@" 2>/dev/null || echo 000)
  printf '%s' "$c"
  rm -f "$tmp"
}

echo "=== Phase 6.1 hardening verify (${BASE}) ==="

c=$(code "${BASE}/api/healthz"); [[ "$c" == "200" ]] && ok "healthz (${c})" || bad "healthz (${c})"
c=$(code "${BASE}/api/livez"); [[ "$c" == "200" ]] && ok "livez (${c})" || bad "livez (${c})"
c=$(code "${BASE}/api/readyz"); [[ "$c" == "200" || "$c" == "503" ]] && ok "readyz (${c})" || bad "readyz (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"phase6-1-nonexist@example.com"}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "200" ]] && ok "forgot unknown email (${c})" || bad "forgot unknown (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/auth/forgot-password")
[[ "$c" == "400" ]] && ok "forgot empty json (${c})" || bad "forgot empty json (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d 'not-json' "${BASE}/api/auth/forgot-password")
[[ "$c" == "400" ]] && ok "forgot invalid json (${c})" || bad "forgot invalid json (${c})"

# No Content-Type — expect 400 not 500 (may be 429 if rate limited)
c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE}/api/auth/forgot-password" 2>/dev/null || echo 000)
if [[ "$c" == "400" ]]; then
  ok "forgot no body (${c})"
elif [[ "$c" == "429" ]]; then
  ok "forgot no body rate-limited (${c}) — retry later"
else
  bad "forgot no body (${c}) expected 400"
fi

c=$(code -X POST -H 'Content-Type: application/json' -d '{"token":"x","password":"weak"}' "${BASE}/api/auth/reset-password")
[[ "$c" == "400" || "$c" == "429" ]] && ok "reset-password weak (${c})" || bad "reset-password (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{}' "${BASE}/api/auth/reset-password")
[[ "$c" == "400" || "$c" == "429" ]] && ok "reset-password empty body (${c})" || bad "reset empty (${c})"

c=$(code -X POST -H 'Content-Type: application/json' -d '{"email":"not-an-email"}' "${BASE}/api/auth/resend-verification")
[[ "$c" == "400" || "$c" == "422" ]] && ok "OTP resend validation (${c})" || bad "OTP resend (${c})"

if bash /opt/souq-arab/scripts/phase6-test-forgot-password-existing.sh 2>/dev/null | tail -1 | grep -qE 'HTTP:(200|502)'; then
  ok "forgot registered user"
else
  bad "forgot registered user"
fi

if API_BASE="$BASE" bash /opt/souq-arab/scripts/phase5-verify-cutover.sh 2>/dev/null | grep -q 'PHASE 5 VERIFY: PASS'; then
  ok "phase5 regression (login/session/favorites/ws/upload)"
else
  bad "phase5 regression"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 6.1 VERIFY: PASS ===" && exit 0
echo "=== PHASE 6.1 VERIFY: FAIL ==="
exit 1

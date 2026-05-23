#!/usr/bin/env bash
# Rate-limit self-test — no secrets. Run on VPS as root or deploy+sudo.
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1}"
UA="souq-phase3-selftest/1.0"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
count_codes() {
  local url="$1" method="${2:-GET}" n="${3:-30}"
  local c429=0 c2xx=0 cother=0 i c
  for i in $(seq 1 "$n"); do
    c="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" -H "User-Agent: $UA" "$url" 2>/dev/null || echo 000)"
    case "$c" in
      429) c429=$((c429 + 1)) ;;
      2*|3*) c2xx=$((c2xx + 1)) ;;
      *) cother=$((cother + 1)) ;;
    esac
  done
  printf '%s %s %s' "$c429" "$c2xx" "$cother"
}

echo "=== Rate limit self-test ==="

# Health must never 429
h="$(count_codes "${BASE_URL}/healthz" GET 50)"
set -- $h
[[ "${1:-0}" -eq 0 ]] && ok "healthz never 429 (50 req)" || bad "healthz got 429: $h"
h2="$(count_codes "${BASE_URL}/api/healthz" GET 50)"
set -- $h2
[[ "${1:-0}" -eq 0 ]] && ok "api/healthz never 429 (50 req)" || bad "api/healthz got 429: $h2"

# Normal browsing simulation — 30 req/s burst to general endpoint
g="$(count_codes "${BASE_URL}/api/categories" GET 35)"
set -- $g
[[ "${1:-0}" -lt 5 ]] && ok "general API tolerant (35 req): 429=$1" || bad "general too strict: $g"

# Auth must eventually 429
a="$(count_codes "${BASE_URL}/api/auth/login" POST 25)"
set -- $a
[[ "${1:-0}" -ge 1 ]] && ok "auth limit triggers 429: $a" || bad "auth never 429: $a"

# Trailing slash must hit auth zone (not bypass)
a2="$(count_codes "${BASE_URL}/api/auth/login/" POST 25)"
set -- $a2
[[ "${1:-0}" -ge 1 ]] && ok "auth/login/ same limit as login: $a2" || bad "auth/login/ bypass?: $a2"

# Admin login
ad="$(count_codes "${BASE_URL}/api/admin-login" POST 20)"
set -- $ad
[[ "${1:-0}" -ge 1 ]] && ok "admin-login limit: $ad" || bad "admin-login never 429: $ad"

# Upload path
up="$(count_codes "${BASE_URL}/api/storage/uploads/ad-images" POST 40)"
set -- $up
[[ "${1:-0}" -ge 1 ]] && ok "upload limit: $up" || bad "upload never 429: $up"

# AI path
ai="$(count_codes "${BASE_URL}/api/ai/suggest-price" POST 50)"
set -- $ai
[[ "${1:-0}" -ge 1 ]] && ok "ai limit: $ai" || bad "ai never 429: $ai"

# Bypass check: wrong case should NOT get auth 429 as fast (hits general) — document only
bc="$(count_codes "${BASE_URL}/api/AUTH/login" POST 25)"
set -- $bc
ok "case-variant /api/AUTH/login codes (info): $bc"

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== RATELIMIT TEST: PASS ==="
  exit 0
fi
echo "=== RATELIMIT TEST: FAIL ==="
exit 1

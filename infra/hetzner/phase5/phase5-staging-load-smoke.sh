#!/usr/bin/env bash
# Light STAGING load on safe read-only endpoints — loopback :3001 only.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/source-staging-smoke-guard.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/source-staging-smoke-guard.sh"
elif [[ -f "${SCRIPT_DIR}/../_guards/source-staging-smoke-guard.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/../_guards/source-staging-smoke-guard.sh"
else
  # shellcheck source=/dev/null
  source "/opt/souq-arab/scripts/source-staging-smoke-guard.sh"
fi
_souq_source_staging_smoke_guard "$SCRIPT_DIR"
staging_smoke_guard "${API_BASE:-}"
BASE="${STAGING_SMOKE_BASE}"

FAIL=0
REQS="${LOAD_REQS:-40}"
CONC="${LOAD_CONC:-4}"
PATHS="/api/healthz /api/categories?limit=3 /api/ads?limit=2"

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 5 load smoke (${REQS} req, conc ${CONC}) on ${BASE} ==="

if command -v ab >/dev/null 2>&1; then
  for p in $PATHS; do
    n=$((REQS / 3))
    [[ "$n" -lt 5 ]] && n=5
    if ab -n "$n" -c "$CONC" -q "${BASE}${p}" 2>/dev/null | grep -q 'Failed requests:[[:space:]]*0'; then
      ok "ab ${p} (${n} req)"
    else
      bad "ab ${p} had failures"
    fi
  done
else
  ok "ab not installed — curl parallel fallback"
  run_one() {
    curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -H 'User-Agent: souq-phase5-load' "${BASE}${1}" 2>/dev/null
  }
  export -f run_one
  export BASE
  codes="$(seq 1 "$REQS" | xargs -P "$CONC" -I{} bash -c 'run_one "/api/categories?limit=2"' | awk '{print $1}' | sort | uniq -c)"
  if echo "$codes" | grep -qvE '^\s*[0-9]+\s+200'; then
    bad "curl load non-200 responses: ${codes}"
  else
    ok "curl parallel /api/categories (${REQS} req)"
  fi
fi

rate="$(curl -s -o /dev/null -w '%{http_code}' -H 'User-Agent: souq-phase5-load' "${BASE}/api/categories?limit=1" 2>/dev/null)"
[[ "$rate" == "200" ]] && ok "post-load categories 200" || bad "post-load categories (${rate})"

[[ "$FAIL" -eq 0 ]] && echo "=== LOAD SMOKE: PASS ===" && exit 0
echo "=== LOAD SMOKE: FAIL ==="
exit 1

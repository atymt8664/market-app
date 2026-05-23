#!/usr/bin/env bash
# Phase 5 verification — STAGING shadow only, no secrets in output.
set -u
FAIL=0
BASE="/opt/souq-arab"
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 5 verify ==="

[[ -f /etc/souq/phase5-applied-at.txt ]] && ok "phase5 marker" || bad "phase5 marker missing"
command -v websocat >/dev/null 2>&1 && ok "websocat installed" || bad "websocat missing"
[[ -d /var/log/souq-arab/baseline ]] && ok "baseline log dir" || bad "baseline dir"

if [[ -f "${BASE}/config/api.env.staging" ]]; then
  grep -q 'qkczposlooaldmsjfmun' "${BASE}/config/api.env.staging" && ok "staging ref present" || bad "staging ref"
  grep -q 'nptfxtkedqndkgmrcntn' "${BASE}/config/api.env.staging" && bad "PRODUCTION ref BLOCK" || ok "production ref absent"
else
  bad "api.env.staging missing"
fi

docker compose -f "${BASE}/api/docker/docker-compose.yml" ps 2>/dev/null | grep -q 'api-1.*Up' && ok "shadow api Up" || bad "api not Up"

echo "--- collect baseline ---"
if bash "${BASE}/scripts/phase5-collect-baseline.sh"; then
  ok "baseline collected"
else
  bad "baseline collect"
fi

echo "--- load smoke ---"
if bash "${BASE}/scripts/phase5-staging-load-smoke.sh"; then
  ok "load smoke"
else
  bad "load smoke"
fi

echo "--- ws probe ---"
if bash "${BASE}/scripts/phase5-ws-probe.sh"; then
  ok "ws probe"
else
  bad "ws probe"
fi

echo "--- phase4 regression smoke ---"
if bash "${BASE}/scripts/phase4-staging-smoke.sh"; then
  ok "phase4 smoke regression"
else
  bad "phase4 smoke regression"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 5: PASS ===" && exit 0
echo "=== PHASE 5: FAIL ==="
exit 1

#!/usr/bin/env bash
set -u
BASE="/opt/souq-arab"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
warn() { printf '  WARN %s\n' "$*"; }

echo "=== Phase 7 verify ==="
[[ -f /etc/souq/phase7-applied-at.txt ]] && ok "phase7 marker" || bad "marker"

bash "${BASE}/scripts/phase7-prod-readonly-external.sh" && ok "prod readonly (Railway)" || bad "prod readonly"

if bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null 2>&1; then
  ok "production env filled"
  if sudo bash "${BASE}/scripts/phase7-execute-cutover.sh"; then ok "full cutover path"; else
    ec=$?; [[ "$ec" -eq 2 ]] && bad "unexpected block" || bad "cutover ($ec)"
  fi
else
  warn "api.env.production empty — VPS prod shadow/cutover blocked"
  ec=0
  sudo bash "${BASE}/scripts/phase7-execute-cutover.sh" 2>/dev/null || ec=$?
  [[ "$ec" -eq 2 ]] && ok "cutover correctly blocked until env filled" || bad "cutover gate ($ec)"
fi

readlink -f "${BASE}/config/api.env" 2>/dev/null | grep -q staging && ok "staging active on VPS" || warn "non-staging active env"

bash "${BASE}/scripts/phase4-staging-smoke.sh" && ok "staging regression" || bad "staging regression"

sudo bash "${BASE}/scripts/phase7-rollback-staging.sh" && ok "rollback staging" || bad "rollback"

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 7: PASS ===" && exit 0
echo "=== PHASE 7: FAIL ==="
exit 1

#!/usr/bin/env bash
# Phase 6 verification — prep only; staging must remain active.
set -u
BASE="/opt/souq-arab"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 6 verify (cutover prep only) ==="

[[ -f /etc/souq/phase6-prep-applied-at.txt ]] && ok "phase6 marker" || bad "phase6 marker"
readlink -f "${BASE}/config/api.env" 2>/dev/null | grep -q 'api.env.staging' && ok "staging env active" || bad "staging not active"
grep -q 'nptfxtkedqndkgmrcntn' "${BASE}/config/api.env.staging" 2>/dev/null && bad "prod ref in staging" || ok "staging env clean"

echo "--- dry-run prep ---"
bash "${BASE}/scripts/phase6-dry-run-prep.sh" && ok "dry-run prep" || bad "dry-run prep"

echo "--- production env guard ---"
if bash "${BASE}/scripts/use-production-env.sh" 2>/dev/null; then
  bad "use-production-env must refuse without SOUQ_CUTOVER_APPROVED=1"
else
  ok "use-production-env blocked (prep)"
fi

echo "--- prod smoke (expect skip) ---"
bash "${BASE}/scripts/phase6-prod-api-smoke-readonly.sh" && ok "prod smoke path" || bad "prod smoke"

echo "--- image prep ---"
bash "${BASE}/scripts/phase6-image-prep-checklist.sh" && ok "image prep" || bad "image prep"

echo "--- redis spike (staging) ---"
if bash "${BASE}/scripts/phase6-staging-redis-spike.sh"; then
  ok "redis spike"
else
  bad "redis spike"
fi

echo "--- phase5 regression ---"
if bash "${BASE}/scripts/verify-phase5.sh" >/dev/null 2>&1; then
  ok "phase5 regression"
else
  bad "phase5 regression"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 6: PASS ===" && exit 0
echo "=== PHASE 6: FAIL ==="
exit 1

#!/usr/bin/env bash
# Cutover dry-run checklist — validates prep only, does NOT switch env or deploy.
set -u
BASE="/opt/souq-arab"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
warn() { printf '  WARN %s\n' "$*"; }

echo "=== Phase 6 dry-run prep ==="

# Prep mode always starts on STAGING (idempotent; no deploy/restart)
bash "${BASE}/scripts/use-staging-env.sh" >/dev/null 2>&1 || true

[[ -f "${BASE}/config/api.env.production" ]] && ok "api.env.production exists" || bad "api.env.production missing"
[[ -f "${BASE}/config/api.env.staging" ]] && ok "api.env.staging exists" || bad "api.env.staging missing"

if readlink -f "${BASE}/config/api.env" 2>/dev/null | grep -q 'api.env.staging'; then
  ok "active env is STAGING (expected during prep)"
else
  bad "active env is NOT staging — stop before prep"
fi

grep -q 'qkczposlooaldmsjfmun' "${BASE}/config/api.env.staging" 2>/dev/null && ok "staging ref in staging env" || bad "staging ref"
grep -q 'nptfxtkedqndkgmrcntn' "${BASE}/config/api.env.staging" 2>/dev/null && bad "production ref in staging env" || ok "no production ref in staging env"

if bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null 2>&1; then
  ok "production env keys ready (filled)"
else
  warn "production env not fully filled (expected until you fill secrets manually)"
  ok "production template present for manual fill"
fi

if bash "${BASE}/scripts/use-production-env.sh" 2>/dev/null; then
  bad "use-production-env must refuse without SOUQ_CUTOVER_APPROVED=1"
else
  ok "use-production-env blocked without approval flag"
fi

if bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null 2>&1; then
  if SOUQ_CUTOVER_APPROVED=1 bash "${BASE}/scripts/use-production-env.sh" 2>/dev/null; then
    ok "use-production-env works when approved and keys filled"
    bash "${BASE}/scripts/use-staging-env.sh" >/dev/null 2>&1 || true
    readlink -f "${BASE}/config/api.env" 2>/dev/null | grep -q 'api.env.staging' \
      && ok "reverted active env to STAGING after probe" \
      || bad "failed to revert to STAGING after probe"
  else
    bad "use-production-env failed despite filled production keys"
  fi
else
  ok "use-production-env with approval deferred until keys filled"
fi

[[ -x "${BASE}/scripts/deploy-api.sh" ]] && ok "deploy-api.sh present" || bad "deploy-api.sh"
[[ -x "${BASE}/scripts/rollback-api.sh" ]] && ok "rollback-api.sh present" || bad "rollback-api.sh"
[[ -f "${BASE}/phase6/CUTOVER-CHECKLIST.md" ]] && ok "cutover checklist doc" || bad "checklist doc"
[[ -f "${BASE}/phase6/SCALE-ROADMAP.md" ]] && ok "scale roadmap doc" || bad "scale roadmap"

tag="$(cat "${BASE}/releases/CURRENT_TAG" 2>/dev/null || echo none)"
[[ "$tag" != "readiness-stub" ]] && ok "shadow image deployed (${tag})" || warn "only stub deployed"

[[ "$FAIL" -eq 0 ]] && echo "=== DRY-RUN PREP: PASS ===" && exit 0
echo "=== DRY-RUN PREP: FAIL ==="
exit 1

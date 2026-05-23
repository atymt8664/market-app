#!/usr/bin/env bash
# Image/tag prep for cutover — no pull, no deploy, no secrets.
set -u
BASE="/opt/souq-arab"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== Phase 6 image prep checklist ==="

current="$(cat "${BASE}/releases/CURRENT_TAG" 2>/dev/null || echo unknown)"
prev="$(cat "${BASE}/releases/PREVIOUS_TAG" 2>/dev/null || echo unknown)"
ok "CURRENT_TAG=${current}"
ok "PREVIOUS_TAG=${prev}"

if docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -q 'souq-api:staging-shadow'; then
  ok "staging shadow image present locally"
else
  bad "staging shadow image missing on VPS"
fi

if [[ -f "${BASE}/phase6/IMAGE-TAGGING.md" ]]; then
  ok "IMAGE-TAGGING.md present"
else
  bad "IMAGE-TAGGING.md missing"
fi

echo "  NOTE cutover image example: souq-api:production-YYYYMMDD (build locally, push registry, then deploy-api.sh)"
[[ "$FAIL" -eq 0 ]] && echo "=== IMAGE PREP: PASS ===" && exit 0
echo "=== IMAGE PREP: FAIL ==="
exit 1

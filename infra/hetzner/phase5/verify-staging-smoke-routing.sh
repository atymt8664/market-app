#!/usr/bin/env bash
# STAGING smoke routing self-test — confirms guards block :80/:3002 and official target is :3001.
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

FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

echo "=== STAGING smoke routing verify ==="

staging_smoke_guard ""
ok "guard accepts official target (${STAGING_SMOKE_BASE})"

if grep -rq '127.0.0.1:3002' /etc/nginx/sites-enabled/ 2>/dev/null; then
  ok "nginx upstream uses prod-shadow :3002 (documented; STAGING smokes bypass via :3001)"
else
  ok "nginx upstream has no :3002 (cutover state may differ)"
fi

if API_BASE=http://127.0.0.1 bash -c '
  SCRIPT_DIR="'"$SCRIPT_DIR"'"
  source "'"${SCRIPT_DIR}/../_guards/source-staging-smoke-guard.sh"'" 2>/dev/null || source /opt/souq-arab/scripts/source-staging-smoke-guard.sh
  _souq_source_staging_smoke_guard "'"$SCRIPT_DIR"'"
  staging_smoke_guard http://127.0.0.1
' 2>/dev/null; then
  bad "guard should reject nginx :80"
else
  ok "guard rejects http://127.0.0.1 (nginx :80)"
fi

if API_BASE=http://127.0.0.1:3002 bash -c '
  source /opt/souq-arab/scripts/source-staging-smoke-guard.sh 2>/dev/null || true
  _souq_source_staging_smoke_guard "'"$SCRIPT_DIR"'"
  staging_smoke_guard http://127.0.0.1:3002
' 2>/dev/null; then
  bad "guard should reject prod-shadow :3002"
else
  ok "guard rejects http://127.0.0.1:3002"
fi

c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/healthz 2>/dev/null || echo 000)
[[ "$c" == "200" ]] && ok "STAGING API :3001 healthz (${c})" || bad "STAGING API :3001 healthz (${c})"

c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/readyz 2>/dev/null || echo 000)
[[ "$c" == "200" || "$c" == "503" ]] && ok "STAGING API :3001 readyz (${c})" || bad "STAGING API :3001 readyz (${c})"

[[ "$FAIL" -eq 0 ]] && echo "=== STAGING ROUTING: PASS ===" && exit 0
echo "=== STAGING ROUTING: FAIL ==="
exit 1

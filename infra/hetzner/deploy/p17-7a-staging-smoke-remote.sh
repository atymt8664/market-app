#!/usr/bin/env bash
# P17-7A — STAGING smoke on VPS loopback :3001 (uses git clone + api-server deps).
set -euo pipefail

BASE="/opt/souq-arab"
GIT_DIR="${BASE}/src/market-app"
STAGING_ENV="${BASE}/config/api.env.staging"
LOG="/var/log/souq-arab/p17-7a-staging-smoke.log"
API_BASE="http://127.0.0.1:3001"

[[ -d "$GIT_DIR/artifacts/api-server" ]] || { echo "FAIL missing git dir — run staging deploy first"; exit 1; }
[[ -f "$STAGING_ENV" ]] || { echo "FAIL missing api.env.staging"; exit 1; }

export TEST_API_BASE="$API_BASE"
set -a
# shellcheck disable=SC1090
source <(grep -E '^(DATABASE_URL|P17_ORDERS_API_ENABLED|P17_BUY_NOW_ENABLED)=' "$STAGING_ENV")
set +a

cd "${GIT_DIR}/artifacts/api-server"
if [[ ! -d node_modules ]]; then
  corepack enable 2>/dev/null || true
  pnpm install --frozen-lockfile >>"$LOG" 2>&1
fi

pnpm run p17-7a:pkg7:closure 2>&1 | tee "$LOG"
exit "${PIPESTATUS[0]}"

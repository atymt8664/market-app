#!/usr/bin/env bash
# P17-PROD-2 authenticated smoke — reads PROD_SMOKE_* / PROD_TEST_* from api.env.production only (no values logged).
set -euo pipefail
PROD_ENV="/opt/souq-arab/config/api.env.production"
GIT_DIR="/opt/souq-arab/src/market-app"
SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
SMOKE="${GIT_DIR}/artifacts/api-server/scripts/p17-prod-deployment-smoke.mjs"
LOG="/var/log/souq-arab/p17-prod-2-smoke.log"

[[ -f "$SMOKE" ]] || { echo "FAIL missing smoke script"; exit 1; }
[[ -n "$SC" ]] || { echo "FAIL no prod-shadow"; exit 1; }

docker cp "$SMOKE" "${SC}:/tmp/p17-prod-2-smoke.mjs" >/dev/null

env_args=()
while IFS= read -r line; do
  key="${line%%=*}"
  case "$key" in
    PROD_SMOKE_EMAIL|PROD_SMOKE_PASSWORD|PROD_TEST_BUYER_EMAIL|PROD_TEST_BUYER_PASSWORD|PROD_TEST_SELLER_EMAIL|PROD_TEST_SELLER_PASSWORD)
      env_args+=(-e "$line")
      ;;
  esac
done < <(grep -E '^(PROD_SMOKE_|PROD_TEST_)' "$PROD_ENV" 2>/dev/null || true)

if [[ "${#env_args[@]}" -lt 2 ]]; then
  echo "FAIL no PROD_SMOKE_* or PROD_TEST_* keys in api.env.production — cannot run authenticated smoke"
  exit 1
fi

docker exec "${env_args[@]}" "$SC" node /tmp/p17-prod-2-smoke.mjs 2>&1 | tee "$LOG"
rc="${PIPESTATUS[0]}"
exit "$rc"

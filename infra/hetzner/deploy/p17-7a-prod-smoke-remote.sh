#!/usr/bin/env bash
# P17-7A — Production smoke after deploy (routes + authenticated if creds present).
set -euo pipefail

PROD_ENV="/opt/souq-arab/config/api.env.production"
GIT_DIR="/opt/souq-arab/src/market-app"
LOG="/var/log/souq-arab/p17-7a-prod-smoke.log"
API="https://api.souq-arab.com"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "${API}${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

probe_post() {
  local path="$1"
  local code body
  code="$(curl -sS -o /tmp/p17-7a-prod-smoke.txt -w '%{http_code}' -X POST "${API}${path}" \
    -H 'content-type: application/json' -d '{}')"
  body="$(cat /tmp/p17-7a-prod-smoke.txt)"
  echo "$body" | grep -q 'Cannot POST' && halt "Cannot POST ${path}"
  log "ROUTE_OK ${path} HTTP ${code}"
}

probe_post "/api/orders"
probe_post "/api/orders/SOUQ-2026-000001/start-preparing"

SMOKE="${GIT_DIR}/artifacts/api-server/scripts/p17-prod-deployment-smoke.mjs"
SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
if [[ -f "$SMOKE" && -n "$SC" ]]; then
  docker cp "$SMOKE" "${SC}:/tmp/p17-7a-prod-smoke.mjs" >/dev/null
  env_args=()
  while IFS= read -r line; do
    key="${line%%=*}"
    case "$key" in
      PROD_SMOKE_EMAIL|PROD_SMOKE_PASSWORD|PROD_TEST_BUYER_EMAIL|PROD_TEST_BUYER_PASSWORD|PROD_TEST_SELLER_EMAIL|PROD_TEST_SELLER_PASSWORD)
        env_args+=(-e "$line")
        ;;
    esac
  done < <(grep -E '^(PROD_SMOKE_|PROD_TEST_)' "$PROD_ENV" 2>/dev/null || true)
  if [[ "${#env_args[@]}" -ge 2 ]]; then
    docker exec "${env_args[@]}" "$SC" node /tmp/p17-7a-prod-smoke.mjs 2>&1 | tee -a "$LOG"
    [[ "${PIPESTATUS[0]}" -eq 0 ]] || halt "authenticated prod smoke failed"
  else
    log "SKIP authenticated smoke (no PROD_TEST_* in api.env.production)"
  fi
fi

log "=== P17-7A PROD SMOKE PASS ==="

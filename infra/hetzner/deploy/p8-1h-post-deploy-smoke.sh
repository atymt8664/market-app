#!/usr/bin/env bash
# P8-1H — Post-deploy smoke (public API + artifact + optional NOC JSON). No secret output.
set -u

API_BASE="${API_BASE:-https://api.souq-arab.com}"
ENV_FILE="${SOUQ_ENV_FILE:-/opt/souq-arab/config/api.env}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
skip() { printf '  SKIP %s\n' "$*"; }

read_env() { grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }

echo "=== P8-1H post-deploy smoke (${API_BASE}) ==="

CID="$(docker ps --format '{{.ID}} {{.Names}}' | awk '/api-api-1|api-1/{print $1; exit}')"
if [[ -z "$CID" ]]; then
  CID="$(docker ps -q --filter 'name=souq-arab-api' | head -1)"
fi
if [[ -n "$CID" ]]; then
  if docker exec "$CID" grep -q buildNocCpuFromServerMetrics /app/artifacts/api-server/dist/index.mjs 2>/dev/null; then
    ok "dist contains buildNocCpuFromServerMetrics"
  else
    bad "dist missing buildNocCpuFromServerMetrics"
  fi
  if docker exec "$CID" grep -q waiting_host_metrics /app/artifacts/api-server/dist/index.mjs 2>/dev/null; then
    bad "dist still contains waiting_host_metrics"
  else
    ok "dist has no waiting_host_metrics"
  fi
else
  bad "API container not found"
fi

c="$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}/api/healthz" 2>/dev/null || echo 000)"
[[ "$c" == "200" ]] && ok "healthz (${c})" || bad "healthz (${c})"

c="$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}/api/readyz" 2>/dev/null || echo 000)"
[[ "$c" == "200" ]] && ok "readyz (${c})" || bad "readyz (${c}) — expected 200"

c="$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}/api/admin/dashboard" 2>/dev/null || echo 000)"
[[ "$c" == "401" || "$c" == "403" ]] && ok "admin/dashboard guard (${c})" || bad "admin/dashboard (${c})"

c="$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}/api/admin/monitoring" 2>/dev/null || echo 000)"
[[ "$c" == "401" || "$c" == "403" ]] && ok "admin/monitoring guard (${c})" || bad "admin/monitoring (${c})"

c="$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}/api/categories" 2>/dev/null || echo 000)"
[[ "$c" == "200" ]] && ok "categories (${c})" || bad "categories (${c})"

SE="$(read_env STAGING_SMOKE_EMAIL)"
SP="$(read_env STAGING_SMOKE_PASSWORD)"
[[ -z "$SE" ]] && SE="$(read_env PROD_SMOKE_EMAIL)"
[[ -z "$SP" ]] && SP="$(read_env PROD_SMOKE_PASSWORD)"

if [[ -n "${SE:-}" && -n "${SP:-}" ]]; then
  JAR="$(mktemp)"
  LC="$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -b "$JAR" -X POST \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${SE}\",\"password\":\"${SP}\"}" \
    "http://127.0.0.1/api/admin-login" 2>/dev/null || echo 000)"
  if [[ "$LC" == "200" ]]; then
    ok "admin-login loopback (${LC})"
    BODY="$(curl -s -b "$JAR" "http://127.0.0.1/api/admin/dashboard" 2>/dev/null || true)"
    if echo "$BODY" | grep -q '"available":true' && echo "$BODY" | grep -q 'loadAvg1m'; then
      ok "NOC liveSystemStatus.cpu (available + loadAvg1m)"
    else
      bad "NOC cpu JSON missing live fields"
    fi
    if echo "$BODY" | grep -q 'waiting_host_metrics'; then
      bad "NOC still references waiting_host_metrics"
    else
      ok "NOC JSON has no waiting_host_metrics"
    fi
    if echo "$BODY" | grep -q '"rssMb"'; then
      ok "NOC liveSystemStatus.ram present"
    else
      bad "NOC ram missing"
    fi
  else
    skip "admin-login loopback (${LC}) — smoke user may not be staff"
  fi
  rm -f "$JAR"
else
  skip "admin NOC JSON (no STAGING_SMOKE_* / PROD_SMOKE_* in active env)"
fi

[[ -f /opt/souq-arab/releases/CURRENT_TAG ]] && ok "CURRENT_TAG=$(cat /opt/souq-arab/releases/CURRENT_TAG)" || bad "CURRENT_TAG missing"

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== P8-1H POST-DEPLOY SMOKE: PASS ==="
  exit 0
fi
echo "=== P8-1H POST-DEPLOY SMOKE: FAIL ==="
exit 1

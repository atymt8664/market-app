#!/usr/bin/env bash
set -euo pipefail
API="https://api.souq-arab.com"
FAIL=0
probe() {
  local path="$1"
  local code body
  code="$(curl -sS -o /tmp/p17v-body.txt -w '%{http_code}' -X POST "${API}${path}" \
    -H 'content-type: application/json' -d '{}')"
  body="$(cat /tmp/p17v-body.txt)"
  if echo "$body" | grep -q 'Cannot POST'; then
    echo "FAIL ${path} Cannot POST"
    FAIL=1
  elif [[ "$code" == "502" || "$code" == "503" ]]; then
    echo "FAIL ${path} HTTP ${code}"
    FAIL=1
  else
    echo "OK ${path} HTTP ${code}"
  fi
}
probe "/api/orders"
probe "/api/orders/SOUQ-2026-000001/accept"
probe "/api/orders/SOUQ-2026-000001/reject"
probe "/api/orders/SOUQ-2026-000001/cancel"
probe "/api/orders/SOUQ-2026-000001/start-preparing"
probe "/api/orders/SOUQ-2026-000001/mark-shipped"
echo "CURRENT_TAG=$(cat /opt/souq-arab/releases/CURRENT_TAG 2>/dev/null || echo none)"
echo "SHADOW_TAG=$(cat /opt/souq-arab/releases/CURRENT_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
exit "$FAIL"

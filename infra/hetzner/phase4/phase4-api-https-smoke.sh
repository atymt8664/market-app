#!/usr/bin/env bash
# Phase 4 — smoke api.souq-arab.com on VPS edge (HTTP Host header or HTTPS when DNS live).
set -u
VPS_IP="${SOUQ_VPS_IP:-178.105.206.173}"
DOMAIN="${SOUQ_API_DOMAIN:-api.souq-arab.com}"
FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || echo 000; }

echo "=== Phase 4 API public hostname smoke ==="

c=$(code -H "Host: ${DOMAIN}" "http://${VPS_IP}/api/healthz")
[[ "$c" == "200" ]] && ok "HTTP Host ${DOMAIN} /api/healthz (${c})" || bad "HTTP Host healthz (${c})"

c=$(code -H "Host: ${DOMAIN}" "http://${VPS_IP}/api/categories")
[[ "$c" == "200" ]] && ok "HTTP Host categories (${c})" || bad "HTTP Host categories (${c})"

RESOLVED=""
command -v getent >/dev/null 2>&1 && RESOLVED="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk '{print $1; exit}' || true)"
if [[ "${RESOLVED}" == "${VPS_IP}" ]]; then
  c=$(code "https://${DOMAIN}/api/healthz")
  [[ "$c" == "200" ]] && ok "HTTPS public /api/healthz (${c})" || bad "HTTPS public healthz (${c})"
  c=$(code "https://${DOMAIN}/api/readyz")
  [[ "$c" == "200" || "$c" == "503" ]] && ok "HTTPS public /api/readyz (${c})" || bad "HTTPS readyz (${c})"
else
  ok "HTTPS public skipped (DNS not on VPS — Railway fallback)"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== PHASE 4 API HTTPS SMOKE: PASS ===" && exit 0
echo "=== PHASE 4 API HTTPS SMOKE: FAIL ==="
exit 1

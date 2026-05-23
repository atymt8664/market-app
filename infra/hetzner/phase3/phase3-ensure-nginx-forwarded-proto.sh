#!/usr/bin/env bash
# Phase 3: nginx must send X-Forwarded-Proto https to upstream for Secure session cookies.
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
SNIP="/etc/nginx/snippets/souq-proxy-params.conf"
APPLY="/opt/souq-arab/scripts/phase7-apply-nginx-forwarded-proto.sh"
if grep -q 'X-Forwarded-Proto https' "$SNIP" 2>/dev/null; then
  echo "OK nginx forwarded-proto already https"
  exit 0
fi
if [[ -x "$APPLY" ]]; then
  bash "$APPLY"
  exit 0
fi
BASE="/opt/souq-arab/phase7/snippets"
if [[ -f "${BASE}/souq-proxy-params-forwarded.conf" ]]; then
  cp -a "$SNIP" "${SNIP}.bak.phase3-$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true
  install -m 644 "${BASE}/souq-proxy-params-forwarded.conf" "$SNIP"
  [[ -f "${BASE}/souq-forwarded-proto-map.conf" ]] && install -m 644 "${BASE}/souq-forwarded-proto-map.conf" /etc/nginx/conf.d/souq-forwarded-proto-map.conf
  nginx -t
  systemctl reload nginx
  echo "OK nginx forwarded-proto applied from phase7 snippets"
else
  echo "BLOCKED missing phase7 nginx snippets on VPS" >&2
  exit 2
fi
NGINX_CONF="/etc/nginx/sites-enabled/souq-api-ready.conf"
if [[ -f "$NGINX_CONF" ]] && grep -q 'X-Forwarded-Proto \$scheme' "$NGINX_CONF" 2>/dev/null; then
  sed -i 's|proxy_set_header X-Forwarded-Proto \$scheme;|proxy_set_header X-Forwarded-Proto https;|g' "$NGINX_CONF"
  nginx -t
  systemctl reload nginx
  echo "OK nginx /api/ws forwarded-proto https"
fi
exit 0

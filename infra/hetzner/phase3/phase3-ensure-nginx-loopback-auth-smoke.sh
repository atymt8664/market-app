#!/usr/bin/env bash
# Loopback smoke: exempt 127.0.0.1 from nginx auth rate limits (verify scripts only).
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
GEO_SRC="/opt/souq-arab/infra/phase3/nginx/souq-loopback-auth-smoke.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$GEO_SRC" ]] || GEO_SRC="${SCRIPT_DIR}/nginx/souq-loopback-auth-smoke.conf"
GEO_DEST="/etc/nginx/conf.d/souq-loopback-auth-smoke.conf"
NGINX_CONF="/etc/nginx/sites-enabled/souq-api-ready.conf"
[[ -f "$GEO_SRC" ]] || { echo "missing $GEO_SRC"; exit 1; }
install -m 644 "$GEO_SRC" "$GEO_DEST"
if grep -q 'key=$souq_api_auth_limit_key' "$NGINX_CONF" 2>/dev/null; then
  echo "OK nginx auth limit key already patched"
else
  mkdir -p /etc/souq/nginx-backups
  cp -a "$NGINX_CONF" "/etc/souq/nginx-backups/souq-api-ready.conf.bak.loopback-$(date -u +%Y%m%dT%H%M%SZ)"
  sed -i 's|limit_req zone=souq_api_auth burst=|limit_req zone=souq_api_auth key=$souq_api_auth_limit_key burst=|g' "$NGINX_CONF"
fi
nginx -t
systemctl reload nginx
echo "OK nginx loopback auth smoke exemption"

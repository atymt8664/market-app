#!/usr/bin/env bash
# Roll back invalid limit_req key= patch (older nginx builds).
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
NGINX_CONF="/etc/nginx/sites-enabled/souq-api-ready.conf"
sed -i 's|limit_req zone=souq_api_auth key=$souq_api_auth_limit_key burst=|limit_req zone=souq_api_auth burst=|g' "$NGINX_CONF"
rm -f /etc/nginx/conf.d/souq-loopback-auth-smoke.conf
nginx -t
systemctl reload nginx
echo "OK nginx auth limit_req restored"

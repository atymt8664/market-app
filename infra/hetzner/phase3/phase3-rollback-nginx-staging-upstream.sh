#!/usr/bin/env bash
# Phase 3 rollback: nginx API upstream back to STAGING shadow (:3001). Railway untouched.
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

NGINX_CONF="/etc/nginx/sites-enabled/souq-api-ready.conf"
sed -i 's|server 127.0.0.1:3002;|server 127.0.0.1:3001;|g' "$NGINX_CONF"
sed -i 's|127.0.0.1:3002|127.0.0.1:3001|g' "$NGINX_CONF"
nginx -t
systemctl reload nginx
rm -f /etc/souq/phase3-production-upstream-at.txt
echo "OK phase3 rollback nginx -> 127.0.0.1:3001 (staging shadow)"

#!/usr/bin/env bash
# Phase 3: route public nginx API upstream to production shadow (:3002). STAGING :3001 unchanged.
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

NGINX_CONF="/etc/nginx/sites-enabled/souq-api-ready.conf"
MARKER="/etc/souq/phase3-production-upstream-at.txt"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"

if grep -q '127.0.0.1:3002' "$NGINX_CONF"; then
  if [[ ! -f "$MARKER" ]]; then
    date -u +"%Y-%m-%dT%H:%M:%SZ" >"$MARKER"
    echo "OK marker written (upstream already :3002)"
  else
    echo "OK already on :3002"
  fi
  exit 0
fi

bash /opt/souq-arab/scripts/check-production-env-ready.sh >/dev/null
grep -q "$PROD_REF" /opt/souq-arab/config/api.env.production
grep -q "$STAGING_REF" /opt/souq-arab/config/api.env.production && { echo "REFUSE staging ref in production env"; exit 1; }

curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null

BACKUP_DIR="/etc/souq/nginx-backups"
mkdir -p "$BACKUP_DIR"
cp -a "$NGINX_CONF" "${BACKUP_DIR}/souq-api-ready.conf.bak.phase3-$(date -u +%Y%m%dT%H%M%SZ)"
rm -f /etc/nginx/sites-enabled/*.bak* 2>/dev/null || true
sed -i 's|server 127.0.0.1:3001;|server 127.0.0.1:3002;|g' "$NGINX_CONF"
sed -i 's|127.0.0.1:3001|127.0.0.1:3002|g' "$NGINX_CONF"
nginx -t
systemctl reload nginx

date -u +"%Y-%m-%dT%H:%M:%SZ" >"$MARKER"
echo "OK phase3 nginx upstream -> 127.0.0.1:3002 (production shadow)"

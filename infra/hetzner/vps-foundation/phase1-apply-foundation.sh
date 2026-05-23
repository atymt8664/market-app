#!/usr/bin/env bash
# Phase 1: VPS foundation + monitoring + logging + stability (no API deploy).
set -euo pipefail

DEPLOY_USER="deploy"
MARKER_DIR="/etc/souq"
WEB_ROOT="/var/www/souq-foundation/health"
NGINX_SITE="/etc/nginx/sites-available/souq-foundation.conf"

log() { printf '[phase1] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

log "deploy passwordless sudo"
install -d -m 0750 /etc/sudoers.d
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-souq-deploy
chmod 440 /etc/sudoers.d/90-souq-deploy
visudo -cf /etc/sudoers.d/90-souq-deploy

log "opt/souq-arab for deploy"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/souq-arab
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/souq-arab/monitoring

log "nginx foundation + healthz"
mkdir -p "$WEB_ROOT"
cat >"$WEB_ROOT/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Souq Arab EU VPS Foundation</title></head>
<body><h1>Souq Arab EU VPS Foundation</h1><p>Phase 1 host ready.</p></body></html>
EOF

cat >"$NGINX_SITE" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    location = /healthz {
        default_type text/plain;
        return 200 'ok';
    }
    location / {
        root /var/www/souq-foundation/health;
        try_files $uri $uri/ =404;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/souq-foundation.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

log "prometheus-node-exporter (localhost metrics)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq install prometheus-node-exporter 2>/dev/null || true
if [[ -f /etc/default/prometheus-node-exporter ]]; then
  sed -i 's/^ARGS=.*/ARGS="--web.listen-address=127.0.0.1:9100"/' /etc/default/prometheus-node-exporter 2>/dev/null || true
fi
systemctl enable prometheus-node-exporter 2>/dev/null || true
systemctl restart prometheus-node-exporter 2>/dev/null || true

log "logrotate nginx"
cat >/etc/logrotate.d/souq-nginx <<'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
EOF

log "journald limits"
mkdir -p /etc/systemd/journald.conf.d
cat >/etc/systemd/journald.conf.d/souq-limits.conf <<'EOF'
[Journal]
SystemMaxUse=500M
RuntimeMaxUse=200M
EOF
systemctl restart systemd-journald

log "remove stale test containers on :80"
docker rm -f nginx-test 2>/dev/null || true

log "foundation marker"
mkdir -p "$MARKER_DIR"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"$MARKER_DIR/foundation-applied-at.txt"
uname -r >>"$MARKER_DIR/foundation-applied-at.txt"
echo "phase1-monitoring-logging" >>"$MARKER_DIR/foundation-applied-at.txt"

log "verify"
curl -fsS http://127.0.0.1/healthz
echo
systemctl is-active nginx prometheus-node-exporter fail2ban docker 2>/dev/null | paste -sd' ' -
log "phase1 complete"

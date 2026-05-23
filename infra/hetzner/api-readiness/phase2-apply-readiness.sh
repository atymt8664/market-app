#!/usr/bin/env bash
# Phase 2: Hybrid API readiness on VPS — no DNS/TLS, no production API image, no secrets.
set -euo pipefail

DEPLOY_USER="deploy"
BASE="/opt/souq-arab"
MARKER_DIR="/etc/souq"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '[phase2] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (or sudo)." >&2
  exit 1
fi

log "directory layout"
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
  "${BASE}/api/docker" \
  "${BASE}/nginx/snippets" \
  "${BASE}/config" \
  "${BASE}/scripts" \
  "${BASE}/monitoring" \
  "${BASE}/logs/api" \
  "${BASE}/logs/nginx"
install -d -m 0750 /var/log/souq-arab
chown "${DEPLOY_USER}:${DEPLOY_USER}" /var/log/souq-arab

log "sync infra files from ${SCRIPT_DIR}"
install -m 0644 "${SCRIPT_DIR}/docker/docker-compose.yml" "${BASE}/api/docker/docker-compose.yml"
install -m 0644 "${SCRIPT_DIR}/docker/stub-nginx.conf" "${BASE}/api/docker/stub-nginx.conf"
install -m 0644 "${SCRIPT_DIR}/nginx/souq-api-ready.conf" "${BASE}/nginx/souq-api-ready.conf"
install -m 0644 "${SCRIPT_DIR}/config/api.env.example" "${BASE}/config/api.env.example"
if [[ ! -f "${BASE}/config/api.env" ]]; then
  install -m 0600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
    "${BASE}/config/api.env.example" "${BASE}/config/api.env"
  log "created empty template ${BASE}/config/api.env (no secrets)"
fi
install -m 0755 "${SCRIPT_DIR}/phase2-apply-readiness.sh" "${BASE}/scripts/phase2-apply-readiness.sh"
install -m 0755 "${SCRIPT_DIR}/verify-phase2.sh" "${BASE}/scripts/verify-phase2.sh"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE}"

log "nginx reverse proxy"
install -m 0644 "${SCRIPT_DIR}/nginx/souq-api-ready.conf" /etc/nginx/sites-available/souq-api-ready.conf
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/souq-foundation.conf
ln -sf /etc/nginx/sites-available/souq-api-ready.conf /etc/nginx/sites-enabled/souq-api-ready.conf
nginx -t
systemctl reload nginx

log "logrotate souq-arab"
cat >/etc/logrotate.d/souq-arab <<'EOF'
/var/log/souq-arab/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid) 2>/dev/null || true
    endscript
}
EOF

log "nginx stub_status (localhost only)"
if ! grep -q 'stub_status' /etc/nginx/conf.d/souq-monitoring.conf 2>/dev/null; then
  cat >/etc/nginx/conf.d/souq-monitoring.conf <<'EOF'
server {
    listen 127.0.0.1:8081;
    server_name localhost;
    location /nginx-status {
        stub_status;
        allow 127.0.0.1;
        deny all;
    }
}
EOF
  nginx -t
  systemctl reload nginx
fi

log "readiness stub (NOT production API)"
cd "${BASE}/api/docker"
docker compose --profile readiness-stub down 2>/dev/null || true
docker compose --profile readiness-stub up -d
docker compose ps

log "phase2 marker"
mkdir -p "${MARKER_DIR}"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"${MARKER_DIR}/phase2-applied-at.txt"
echo "hybrid-api-readiness" >>"${MARKER_DIR}/phase2-applied-at.txt"
echo "stub-profile=readiness-stub" >>"${MARKER_DIR}/phase2-applied-at.txt"

log "verify"
"${BASE}/scripts/verify-phase2.sh"
log "phase2 complete"

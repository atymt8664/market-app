#!/usr/bin/env bash
# Phase 1 gap-close only — idempotent. No API, DNS, secrets, SSH keys, or Docker reconfig.
set -euo pipefail

DEPLOY_USER="deploy"
MARKER_DIR="/etc/souq"
WEB_ROOT="/var/www/souq-foundation/health"
NGINX_SITE="/etc/nginx/sites-available/souq-foundation.conf"
SWAP_GB=2
TIMEZONE="Europe/Berlin"

log() { printf '[phase1-gap] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

log "timezone -> ${TIMEZONE}"
ln -sf "/usr/share/zoneinfo/${TIMEZONE}" /etc/localtime
echo "${TIMEZONE}" >/etc/timezone

log "swap ${SWAP_GB}G + swappiness=10"
if ! swapon --show 2>/dev/null | grep -q .; then
  SWAP_FILE="/swapfile"
  if [[ ! -f "${SWAP_FILE}" ]]; then
    fallocate -l "${SWAP_GB}G" "${SWAP_FILE}" 2>/dev/null \
      || dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=$((SWAP_GB * 1024)) status=none
    chmod 600 "${SWAP_FILE}"
    mkswap "${SWAP_FILE}"
  fi
  swapon "${SWAP_FILE}" 2>/dev/null || true
  grep -q "${SWAP_FILE}" /etc/fstab || echo "${SWAP_FILE} none swap sw 0 0" >>/etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
grep -q '^vm.swappiness' /etc/sysctl.d/99-souq.conf 2>/dev/null \
  || echo 'vm.swappiness=10' >>/etc/sysctl.d/99-souq.conf

log "UFW: 22, 80, 443 only"
if command -v ufw >/dev/null 2>&1; then
  ufw --force reset >/dev/null 2>&1 || true
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp comment 'SSH'
  ufw allow 80/tcp comment 'HTTP'
  ufw allow 443/tcp comment 'HTTPS'
  ufw --force enable
fi

log "deploy passwordless sudo (ops only; no sshd changes)"
install -d -m 0750 /etc/sudoers.d
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-souq-deploy
chmod 440 /etc/sudoers.d/90-souq-deploy
visudo -cf /etc/sudoers.d/90-souq-deploy

log "opt/souq-arab layout"
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/souq-arab/monitoring

log "nginx foundation + /healthz"
mkdir -p "${WEB_ROOT}"
cat >"${WEB_ROOT}/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Souq Arab EU VPS Foundation</title></head>
<body><h1>Souq Arab EU VPS Foundation</h1><p>Phase 1 host ready.</p></body></html>
EOF

cat >"${NGINX_SITE}" <<'EOF'
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
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/souq-foundation.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

log "prometheus-node-exporter (127.0.0.1:9100)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq install prometheus-node-exporter
if [[ -f /etc/default/prometheus-node-exporter ]]; then
  sed -i 's/^ARGS=.*/ARGS="--web.listen-address=127.0.0.1:9100"/' /etc/default/prometheus-node-exporter
fi
systemctl enable prometheus-node-exporter
systemctl restart prometheus-node-exporter

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

log "remove stale nginx-test container if any"
docker rm -f nginx-test 2>/dev/null || true

log "foundation marker"
mkdir -p "${MARKER_DIR}"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"${MARKER_DIR}/foundation-applied-at.txt"
uname -r >>"${MARKER_DIR}/foundation-applied-at.txt"
echo "phase1-gap-close" >>"${MARKER_DIR}/foundation-applied-at.txt"

log "verify"
curl -fsS http://127.0.0.1/healthz
echo
systemctl is-active nginx prometheus-node-exporter fail2ban docker ufw 2>/dev/null | paste -sd' ' -
swapon --show
timedatectl show -p Timezone --value 2>/dev/null || cat /etc/timezone
log "phase1 gap-close complete"

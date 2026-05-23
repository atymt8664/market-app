#!/usr/bin/env bash
# Souq Arab EU — VPS production foundation (API host only).
# Idempotent. No app deploy, no secrets, no DNS changes.
# Run as root on a fresh or lightly used Ubuntu LTS server.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

HOSTNAME_TARGET="${HOSTNAME_TARGET:-souq-arab-api-prod-01}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
TIMEZONE="${TIMEZONE:-Europe/Berlin}"
SWAP_GB="${SWAP_GB:-2}"
SSH_PORT="${SSH_PORT:-22}"

log() { printf '[foundation] %s\n' "$*"; }
warn() { printf '[foundation][warn] %s\n' "$*" >&2; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

# --- OS gate ---
source /etc/os-release 2>/dev/null || true
UBUNTU_MAJOR="${VERSION_ID%%.*}"
log "Detected: ${PRETTY_NAME:-unknown}"

if [[ "${ID:-}" != "ubuntu" ]]; then
  warn "Expected Ubuntu; continuing with caution."
fi

if [[ "${UBUNTU_MAJOR:-0}" -eq 26 ]]; then
  warn "Ubuntu 26.04 is very new. For maximum LTS maturity consider 24.04 before app go-live."
fi

# --- Hostname & timezone ---
if command -v hostnamectl >/dev/null 2>&1; then
  hostnamectl set-hostname "$HOSTNAME_TARGET" || true
fi
echo "$HOSTNAME_TARGET" >/etc/hostname
timedatectl set-timezone "$TIMEZONE" 2>/dev/null || ln -sf "/usr/share/zoneinfo/$TIMEZONE" /etc/localtime

# --- Packages: base ---
apt-get update -qq
apt-get -y -qq upgrade
apt-get -y -qq install \
  ca-certificates curl gnupg lsb-release \
  apt-transport-https software-properties-common \
  ufw fail2ban unattended-upgrades \
  logrotate nginx certbot python3-certbot-nginx \
  htop iotop sysstat jq git vim-tiny \
  prometheus-node-exporter 2>/dev/null || apt-get -y -qq install htop sysstat jq git vim-tiny

# prometheus-node-exporter may be in universe
if ! dpkg -s prometheus-node-exporter >/dev/null 2>&1; then
  apt-get -y -qq install prometheus-node-exporter 2>/dev/null || warn "prometheus-node-exporter not installed (optional)."
fi

# --- Unattended security upgrades ---
cat >/etc/apt/apt.conf.d/51souq-unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true
systemctl enable --now unattended-upgrades 2>/dev/null || true

# --- Deploy user ---
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo "$DEPLOY_USER"
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
    log "Copied root authorized_keys to $DEPLOY_USER."
  else
    warn "No /root/.ssh/authorized_keys — ensure $DEPLOY_USER has SSH keys before disabling root SSH."
  fi
  passwd -l "$DEPLOY_USER" 2>/dev/null || true
fi

# Passwordless sudo for deploy (limited command style can be tightened later)
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-souq-deploy
chmod 440 /etc/sudoers.d/90-souq-deploy

# --- Swap (safety for 8GB under spike load) ---
if [[ "$SWAP_GB" -gt 0 ]] && ! swapon --show | grep -q .; then
  SWAP_FILE="/swapfile"
  if [[ ! -f "$SWAP_FILE" ]]; then
  fallocate -l "${SWAP_GB}G" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$((SWAP_GB * 1024)) status=progress
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  fi
  swapon "$SWAP_FILE" 2>/dev/null || true
  grep -q "$SWAP_FILE" /etc/fstab || echo "$SWAP_FILE none swap sw 0 0" >>/etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  grep -q '^vm.swappiness' /etc/sysctl.d/99-souq.conf 2>/dev/null || echo 'vm.swappiness=10' >>/etc/sysctl.d/99-souq.conf
  log "Swap ${SWAP_GB}G configured (swappiness=10)."
fi

# --- Docker (official) ---
install -d -m 0755 /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi
ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  >/etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

# Docker daemon: log rotation & live-restore friendly defaults
mkdir -p /etc/docker
cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" },
  "live-restore": true
}
EOF
systemctl restart docker

# --- Fail2Ban ---
install -d /etc/fail2ban/jail.d
cat >/etc/fail2ban/jail.d/souq-sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
maxretry = 5
findtime = 10m
bantime = 1h
backend = systemd
EOF
systemctl enable --now fail2ban

# --- SSH hardening ---
SSHD_DROPIN=/etc/ssh/sshd_config.d/99-souq-hardening.conf
DEPLOY_HAS_KEYS=0
if [[ -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]]; then
  DEPLOY_HAS_KEYS=1
fi

ROOT_LOGIN="prohibit-password"
if [[ "$DEPLOY_HAS_KEYS" -eq 1 ]]; then
  ROOT_LOGIN="no"
  log "Deploy user has keys — root SSH login will be disabled."
else
  warn "Deploy user has no authorized_keys — root login left as prohibit-password only."
fi

cat >"$SSHD_DROPIN" <<EOF
# Souq Arab EU — managed by bootstrap-foundation.sh
PermitRootLogin ${ROOT_LOGIN}
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 5
LoginGraceTime 30
EOF

sshd -t
systemctl reload ssh || systemctl reload sshd

# --- UFW ---
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# --- Nginx: foundation site (no API upstream yet) ---
install -d /var/www/souq-foundation/health
cat >/var/www/souq-foundation/health/index.html <<'EOF'
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>foundation</title></head>
<body><p>ok</p></body></html>
EOF

cat >/etc/nginx/sites-available/souq-foundation.conf <<'EOF'
# Souq Arab EU — VPS foundation (replace with api vhost when DNS is ready)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location = /healthz {
        add_header Content-Type text/plain;
        return 200 'ok';
    }

    location / {
        root /var/www/souq-foundation/health;
        try_files $uri $uri/ =404;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/souq-foundation.conf /etc/nginx/sites-enabled/souq-foundation.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# --- Certbot readiness (no cert issued without domain) ---
systemctl enable certbot.timer 2>/dev/null || true

# --- Logrotate extras ---
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

# --- Sysctl: basic network hardening ---
cat >/etc/sysctl.d/99-souq-network.conf <<'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
EOF
sysctl --system >/dev/null 2>&1 || true

# --- Foundation status marker ---
mkdir -p /etc/souq
date -u +"%Y-%m-%dT%H:%M:%SZ" >/etc/souq/foundation-applied-at.txt
uname -r >>/etc/souq/foundation-applied-at.txt

log "Foundation bootstrap complete."
log "Next: point api DNS, certbot --nginx -d api.example.com, deploy API container."

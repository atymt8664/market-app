#!/usr/bin/env bash
# Read-only checks after bootstrap-foundation.sh (no secrets).
set -u

echo "=== OS ==="
lsb_release -a 2>/dev/null || cat /etc/os-release
echo
echo "=== Hostname / TZ ==="
hostname -f 2>/dev/null || hostname
timedatectl 2>/dev/null | head -3
echo
echo "=== Resources ==="
free -h
swapon --show 2>/dev/null || true
df -h /
echo
echo "=== SSH ==="
sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication|maxauthtries)' || true
echo
echo "=== UFW ==="
ufw status verbose 2>/dev/null || true
echo
echo "=== Docker ==="
docker --version 2>/dev/null || true
docker compose version 2>/dev/null || true
systemctl is-active docker 2>/dev/null || true
echo
echo "=== Nginx ==="
nginx -v 2>&1 || true
systemctl is-active nginx 2>/dev/null || true
curl -fsS http://127.0.0.1/healthz 2>/dev/null && echo || echo "healthz failed"
echo
echo "=== Fail2Ban ==="
systemctl is-active fail2ban 2>/dev/null || true
fail2ban-client status sshd 2>/dev/null | head -5 || true
echo
echo "=== Foundation marker ==="
cat /etc/souq/foundation-applied-at.txt 2>/dev/null || echo "not applied yet"

#!/usr/bin/env bash
# Phase 3: Security + rate limits + performance (VPS edge only). Idempotent.
set -euo pipefail

DEPLOY_USER="deploy"
BASE="/opt/souq-arab"
MARKER_DIR="/etc/souq"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '[phase3] %s\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (or sudo)." >&2
  exit 1
fi

log "sync configs to ${BASE}"
install -d -m 0755 "${BASE}/nginx/snippets" "${BASE}/hardening" "${BASE}/releases"
DEPLOY_SRC="$(cd "${SCRIPT_DIR}/../deploy" && pwd)"
if [[ -d "${DEPLOY_SRC}" ]]; then
  install -m 0644 "${DEPLOY_SRC}/DEPLOY.md" "${BASE}/DEPLOY.md"
  install -m 0755 "${DEPLOY_SRC}/"*.sh "${BASE}/scripts/" 2>/dev/null || true
install -m 0755 "${SCRIPT_DIR}/phase3-selftest-ratelimits.sh" "${BASE}/scripts/phase3-selftest-ratelimits.sh"
fi
install -m 0644 "${SCRIPT_DIR}/nginx/"*.conf "${BASE}/hardening/"
install -m 0644 "${SCRIPT_DIR}/nginx/souq-api-ready.conf" "${BASE}/nginx/souq-api-ready.conf"
install -m 0644 "${SCRIPT_DIR}/nginx/snippets/"*.conf "${BASE}/nginx/snippets/"
install -m 0755 "${SCRIPT_DIR}/phase3-apply-hardening.sh" "${BASE}/scripts/phase3-apply-hardening.sh"
install -m 0755 "${SCRIPT_DIR}/verify-phase3.sh" "${BASE}/scripts/verify-phase3.sh"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE}"

log "nginx phase3 includes"
install -m 0644 "${SCRIPT_DIR}/nginx/souq-phase3-limits.conf" /etc/nginx/conf.d/souq-phase3-limits.conf
install -m 0644 "${SCRIPT_DIR}/nginx/souq-phase3-performance.conf" /etc/nginx/conf.d/souq-phase3-performance.conf
install -m 0644 "${SCRIPT_DIR}/nginx/snippets/souq-proxy-params.conf" /etc/nginx/snippets/souq-proxy-params.conf
install -m 0644 "${SCRIPT_DIR}/nginx/snippets/souq-security-headers.conf" /etc/nginx/snippets/souq-security-headers.conf
install -m 0644 "${SCRIPT_DIR}/nginx/souq-api-ready.conf" /etc/nginx/sites-available/souq-api-ready.conf
ln -sf /etc/nginx/sites-available/souq-api-ready.conf /etc/nginx/sites-enabled/souq-api-ready.conf
nginx -t
systemctl reload nginx

log "sysctl network tuning"
install -m 0644 "${SCRIPT_DIR}/sysctl/99-souq-network.conf" /etc/sysctl.d/99-souq-network.conf
sysctl --system >/dev/null 2>&1 || sysctl -p /etc/sysctl.d/99-souq-network.conf

log "fail2ban nginx rate-limit jail"
install -m 0644 "${SCRIPT_DIR}/fail2ban/souq-nginx-limit.conf" /etc/fail2ban/filter.d/souq-nginx-limit.conf
install -m 0644 "${SCRIPT_DIR}/fail2ban/jail.d-souq-nginx-limit.conf" /etc/fail2ban/jail.d/souq-nginx-limit.conf
systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl reload fail2ban 2>/dev/null || systemctl restart fail2ban

log "phase3 marker"
mkdir -p "${MARKER_DIR}"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"${MARKER_DIR}/phase3-applied-at.txt"
echo "security-rate-limits-performance" >>"${MARKER_DIR}/phase3-applied-at.txt"

log "verify"
"${BASE}/scripts/verify-phase3.sh"
log "phase3 complete"

#!/usr/bin/env bash
# Phase 4 — prepare api.souq-arab.com on VPS for HTTPS (Let's Encrypt via certbot).
# Does NOT change DNS. Railway at api.souq-arab.com stays until DNS swing approval.
# Idempotent; no secret output.
set -euo pipefail

VPS_IP="${SOUQ_VPS_IP:-178.105.206.173}"
DOMAIN="${SOUQ_API_DOMAIN:-api.souq-arab.com}"
NGINX_SITE="souq-api-public.conf"
NGINX_AVAIL="/etc/nginx/sites-available/${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE}"
CERTBOT_WEBROOT="/var/www/certbot"
NGINX_SRC="/opt/souq-arab/phase4/nginx/${NGINX_SITE}"
if [[ ! -f "${NGINX_SRC}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  NGINX_SRC="${SCRIPT_DIR}/nginx/${NGINX_SITE}"
fi

log() { printf '[phase4-https] %s\n' "$*"; }
blocked() { log "BLOCKED $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

log "step1 install nginx public vhost (HTTP + ACME webroot)"
mkdir -p "${CERTBOT_WEBROOT}"
chown -R www-data:www-data "${CERTBOT_WEBROOT}" 2>/dev/null || true
install -m 644 "${NGINX_SRC}" "${NGINX_AVAIL}"
ln -sf "${NGINX_AVAIL}" "${NGINX_ENABLED}"
nginx -t
systemctl reload nginx

log "step2 DNS readiness (no values from env files)"
RESOLVED=""
if command -v getent >/dev/null 2>&1; then
  RESOLVED="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk '{print $1; exit}' || true)"
fi
if [[ -z "${RESOLVED}" ]] && command -v dig >/dev/null 2>&1; then
  RESOLVED="$(dig +short A "${DOMAIN}" 2>/dev/null | grep -E '^[0-9.]+$' | head -1 || true)"
fi

if [[ -z "${RESOLVED}" ]]; then
  blocked "cannot resolve ${DOMAIN} — keep Railway DNS; install HTTP vhost only"
fi

if [[ "${RESOLVED}" != "${VPS_IP}" ]]; then
  log "DNS ${DOMAIN} -> ${RESOLVED} (VPS ${VPS_IP}) — Railway fallback preserved"
  log "HTTP vhost ready; certbot skipped until A-record points to VPS"
  date -u +"%Y-%m-%dT%H:%M:%SZ" > /etc/souq/phase4-https-prep-http-at.txt
  echo "OK phase4 https prep (HTTP only; DNS still external)"
  exit 2
fi

log "step3 DNS points to VPS — issue TLS certificate"
if ! command -v certbot >/dev/null 2>&1; then
  blocked "certbot not installed"
fi

CERTBOT_ARGS=(certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect)
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  CERTBOT_ARGS+=(--email "${CERTBOT_EMAIL}")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi

"${CERTBOT_ARGS[@]}"
nginx -t
systemctl reload nginx

log "step4 verify TLS listener"
if ! ss -tln | grep -q ':443 '; then
  blocked "port 443 not listening after certbot"
fi

date -u +"%Y-%m-%dT%H:%M:%SZ" > /etc/souq/phase4-https-live-at.txt
echo "OK phase4 https live on ${DOMAIN}"

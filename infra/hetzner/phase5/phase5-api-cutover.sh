#!/usr/bin/env bash
# Phase 5 — api.souq-arab.com -> VPS + live HTTPS. Railway service stays up (DNS rollback path).
# Requires DNS A record -> 178.105.206.173 (set at registrar before or during run).
set -euo pipefail

VPS_IP="${SOUQ_VPS_IP:-178.105.206.173}"
DOMAIN="${SOUQ_API_DOMAIN:-api.souq-arab.com}"
WAIT_SEC="${SOUQ_DNS_WAIT_SECONDS:-900}"
POLL="${SOUQ_DNS_POLL_SECONDS:-15}"
BASE_DIR="/opt/souq-arab"
SCRIPTS="${BASE_DIR}/scripts"

log() { printf '[phase5-cutover] %s\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

resolve_v4() {
  local ip=""
  if command -v getent >/dev/null 2>&1; then
    ip="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk '{print $1; exit}' || true)"
  fi
  if [[ -z "${ip}" ]] && command -v dig >/dev/null 2>&1; then
    ip="$(dig +short A "${DOMAIN}" 2>/dev/null | grep -E '^[0-9.]+$' | head -1 || true)"
  fi
  printf '%s' "${ip}"
}

log "step0 preflight"
bash "${SCRIPTS}/phase4-diagnose.sh" || true
bash "${SCRIPTS}/check-production-env-ready.sh" >/dev/null 2>&1 || {
  log "BLOCKED production env not ready on VPS"
  exit 2
}

log "step1 wait for DNS ${DOMAIN} -> ${VPS_IP} (max ${WAIT_SEC}s)"
deadline=$(( $(date +%s) + WAIT_SEC ))
resolved=""
while [[ $(date +%s) -lt $deadline ]]; do
  resolved="$(resolve_v4)"
  [[ "${resolved}" == "${VPS_IP}" ]] && break
  log "DNS now ${resolved:-unresolved}; waiting..."
  sleep "${POLL}"
done

if [[ "${resolved}" != "${VPS_IP}" ]]; then
  log "BLOCKED: set registrar A record ${DOMAIN} -> ${VPS_IP} (remove Railway CNAME)"
  log "Railway fallback host stays: t20ubv01.up.railway.app (rollback = restore CNAME)"
  exit 2
fi

log "step2 issue TLS (certbot)"
SOUQ_VPS_IP="${VPS_IP}" bash "${SCRIPTS}/phase4-prepare-api-https.sh"

log "step3 public HTTPS smoke"
bash "${SCRIPTS}/phase4-api-https-smoke.sh"

log "step4 full cutover verify"
API_BASE="https://${DOMAIN}" bash "${SCRIPTS}/phase5-verify-cutover.sh"

log "step5 production shadow regression (loopback)"
bash "${SCRIPTS}/phase7-vps-prod-shadow-smoke.sh"

log "step6 Railway fallback still alive"
bash "${SCRIPTS}/phase5-railway-fallback-smoke.sh"

date -u +"%Y-%m-%dT%H:%M:%SZ" > /etc/souq/phase5-api-cutover-at.txt
echo "OK phase5 api cutover complete on ${DOMAIN}"

#!/usr/bin/env bash
# Phase 5: STAGING observability tooling on VPS — idempotent, no secrets.
set -euo pipefail

DEPLOY_USER="deploy"
BASE="/opt/souq-arab"
MARKER_DIR="/etc/souq"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '[phase5] %s\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }

log "packages (apache2-utils, curl, jq)"
export DEBIAN_FRONTEND=noninteractive
apt-get -qq update
apt-get -y -qq install apache2-utils curl jq ca-certificates

if ! command -v websocat >/dev/null 2>&1; then
  log "websocat binary (apt unavailable on this image)"
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) ws_asset="websocat.x86_64-unknown-linux-musl" ;;
    aarch64|arm64) ws_asset="websocat.aarch64-unknown-linux-musl" ;;
    *) echo "Unsupported arch for websocat: ${arch}" >&2; exit 1 ;;
  esac
  tmp="$(mktemp)"
  if curl -fsSL --max-time 60 "https://github.com/vi/websocat/releases/download/v1.13.0/${ws_asset}" -o "$tmp"; then
    install -m 0755 "$tmp" /usr/local/bin/websocat
    rm -f "$tmp"
  else
    rm -f "$tmp"
    echo "websocat download failed" >&2
    exit 1
  fi
fi
command -v websocat >/dev/null 2>&1 || { echo "websocat missing after install" >&2; exit 1; }

log "baseline log dir"
install -d -m 0750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/souq-arab/baseline

log "sync phase5 scripts"
install -d -m 0755 "${BASE}/scripts" "${BASE}/phase5"
for f in phase5-collect-baseline.sh phase5-staging-load-smoke.sh phase5-ws-probe.sh verify-phase5.sh; do
  install -m 0755 "${SCRIPT_DIR}/${f}" "${BASE}/scripts/${f}"
done
install -m 0644 "${SCRIPT_DIR}/README.md" "${BASE}/phase5/README.md"
install -m 0644 "${SCRIPT_DIR}/CUTOVER-RUNBOOK.md" "${BASE}/phase5/CUTOVER-RUNBOOK.md"
install -m 0755 "${SCRIPT_DIR}/phase5-apply-staging-baseline.sh" "${BASE}/scripts/phase5-apply-staging-baseline.sh"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE}/phase5" /var/log/souq-arab/baseline

log "refuse production env active"
if [[ -f "${BASE}/config/api.env.staging" ]] && grep -q 'nptfxtkedqndkgmrcntn' "${BASE}/config/api.env.staging" 2>/dev/null; then
  echo "REFUSE: production ref in api.env.staging" >&2
  exit 1
fi

log "marker"
mkdir -p "${MARKER_DIR}"
date -u +"%Y-%m-%dT%H:%M:%SZ" >"${MARKER_DIR}/phase5-applied-at.txt"
echo "staging-observability-load-baseline" >>"${MARKER_DIR}/phase5-applied-at.txt"

log "phase5 apply complete"

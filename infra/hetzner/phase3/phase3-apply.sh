#!/usr/bin/env bash
set -euo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="/opt/souq-arab"
install -d -m 0755 "${BASE}/scripts"
for f in phase3-activate-vps-production-upstream.sh phase3-rollback-nginx-staging-upstream.sh verify-phase3.sh phase3-ensure-nginx-forwarded-proto.sh phase3-ensure-nginx-loopback-auth-smoke.sh; do
  install -m 0755 "${SCRIPT_DIR}/${f}" "${BASE}/scripts/${f}"
done
if [[ -d "${SCRIPT_DIR}/nginx" ]]; then
  install -d -m 0755 "${BASE}/infra/phase3/nginx"
  install -m 644 "${SCRIPT_DIR}/nginx/"*.conf "${BASE}/infra/phase3/nginx/"
fi
for f in phase7-vps-prod-shadow-smoke.sh phase7-post-cutover-e2e.sh phase3-production-ws-probe.sh phase7-apply-nginx-forwarded-proto.sh; do
  [[ -f "${SCRIPT_DIR}/${f}" ]] && install -m 0755 "${SCRIPT_DIR}/${f}" "${BASE}/scripts/${f}" || true
done
mkdir -p /etc/souq
echo "OK phase3 scripts installed"

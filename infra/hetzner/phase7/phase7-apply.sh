#!/usr/bin/env bash
set -euo pipefail
DEPLOY_USER="deploy"
BASE="/opt/souq-arab"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
install -d -m 0755 "${BASE}/scripts" "${BASE}/phase7"
for f in phase7-prod-readonly-external.sh phase7-vps-prod-shadow-smoke.sh phase7-execute-cutover.sh phase7-rollback-staging.sh phase7-post-cutover-e2e.sh phase7-apply-nginx-forwarded-proto.sh verify-phase7.sh; do
  install -m 0755 "${SCRIPT_DIR}/${f}" "${BASE}/scripts/${f}"
done
install -m 0644 "${SCRIPT_DIR}/docker-compose.production-shadow.yml" "${BASE}/phase7/docker-compose.production-shadow.yml"
install -d -m 0755 "${BASE}/phase7/snippets"
for sn in souq-forwarded-proto-map.conf souq-proxy-params-forwarded.conf; do
  install -m 0644 "${SCRIPT_DIR}/snippets/${sn}" "${BASE}/phase7/snippets/${sn}"
done
install -m 0644 "${SCRIPT_DIR}/README.md" "${BASE}/phase7/README.md"
install -m 0755 "${SCRIPT_DIR}/phase7-apply.sh" "${BASE}/scripts/phase7-apply.sh"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE}/phase7"
mkdir -p /etc/souq
date -u +"%Y-%m-%dT%H:%M:%SZ" > /etc/souq/phase7-applied-at.txt
echo "cutover-execution-partial" >> /etc/souq/phase7-applied-at.txt
echo "OK phase7 apply"

#!/usr/bin/env bash
# P8-1H — Build and deploy API on VPS (production traffic path). No secret output.
set -euo pipefail

TAG="${SOUQ_P8_1H_IMAGE:-souq-api:p8-1h-20260531}"
ARCHIVE="${1:-/tmp/p8-1h-build.tgz}"
CTX="${SOUQ_BUILD_CTX:-/tmp/souq-p8-1h-build-context}"
BASE="/opt/souq-arab"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"

[[ -f "$ARCHIVE" ]] || { echo "FAIL missing archive ${ARCHIVE}"; exit 1; }

echo "=== P8-1H API deploy (${TAG}) ==="

if grep -q "$PROD_REF" "${BASE}/config/api.env" 2>/dev/null; then
  echo "NOTE active api.env uses PRODUCTION ref"
elif grep -q "$STAGING_REF" "${BASE}/config/api.env" 2>/dev/null; then
  echo "NOTE active api.env uses STAGING ref (existing cutover path)"
else
  echo "WARN could not confirm Supabase ref in active api.env"
fi

echo ">> extract build context (${CTX})"
rm -rf "$CTX"
mkdir -p "$CTX"
tar -xzf "$ARCHIVE" -C "$CTX"

echo ">> verify P8-1H sources in context"
grep -q buildNocCpuFromServerMetrics "${CTX}/artifacts/api-server/src/lib/noc-cpu-metrics.ts"
grep -q snapshotServerMetrics "${CTX}/artifacts/api-server/src/lib/admin-noc-snapshot.ts"
! grep -q 'placeholderKey: "p8.admin.noc.cpu.waiting_host_metrics"' "${CTX}/artifacts/api-server/src/lib/admin-noc-snapshot.ts"

echo ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" .

echo ">> deploy"
sudo bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull

echo ">> verify-deploy"
sudo bash "${BASE}/scripts/verify-deploy.sh"

echo ">> deploy prod-shadow (public nginx upstream :3002)"
sudo SOUQ_PROD_IMAGE="${TAG}" bash "${BASE}/scripts/phase8-release-deploy-prod-shadow.sh"

echo ">> env isolation audit"
sudo bash "${BASE}/scripts/p8-1i-vps-env-isolation-audit.sh" 2>/dev/null \
  || sudo bash "${BASE}/infra/hetzner/deploy/p8-1i-vps-env-isolation-audit.sh"

echo "P8_1H_DEPLOY_DONE tag=${TAG}"

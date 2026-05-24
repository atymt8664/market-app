#!/usr/bin/env bash
# P11 — STAGING VPS push activation (VAPID env + image + push-worker). No secret output.
set -euo pipefail

STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
ENV_FILE="/opt/souq-arab/config/api.env.staging"
CTX="/opt/souq-arab/build-context"
ARCHIVE="${1:-/tmp/souq-p11-archive.tgz}"
TAG="${SOUQ_P11_IMAGE:-souq-api:staging-shadow-$(date -u +%Y%m%d)-p11}"
BASE="/opt/souq-arab"

[[ -f "$ENV_FILE" ]] || { echo "FAIL missing env"; exit 1; }
grep -q "$STAGING_REF" "$ENV_FILE" || { echo "REFUSE no staging ref"; exit 2; }
grep -q "$PROD_REF" "$ENV_FILE" && { echo "REFUSE production ref in staging env"; exit 2; }
[[ -f "$ARCHIVE" ]] || { echo "FAIL missing archive $ARCHIVE"; exit 1; }

echo "=== P11 STAGING push activation ==="

echo ">> extract build context"
tar -xzf "$ARCHIVE" -C "$CTX"

echo ">> verify staging env keys (VAPID/REDIS must be set before run)"
grep -q '^VAPID_PUBLIC_KEY=.' "$ENV_FILE" || { echo "FAIL VAPID_PUBLIC_KEY missing — run p11-push-vapid-to-vps.mjs first"; exit 1; }
grep -q '^REDIS_URL=.' "$ENV_FILE" || { echo "FAIL REDIS_URL missing"; exit 1; }
echo "OK vapid/redis env present"

echo ">> ensure staging env active"
sudo bash "${BASE}/scripts/use-staging-env.sh" 2>/dev/null || ln -sf api.env.staging "${BASE}/config/api.env"

echo ">> build API image ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" .

echo ">> deploy STAGING API (port 3001 only)"
sudo bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull

echo ">> recreate API for fresh env_file"
cd "${BASE}/api/docker"
SOUQ_API_IMAGE="$TAG" docker compose --profile production up -d --force-recreate api

echo ">> sync phase6 compose (push-worker service)"
install -m 644 "${CTX}/infra/hetzner/phase6/docker-compose.scale-prep.yml" "${BASE}/phase6/docker-compose.scale-prep.yml"

echo ">> start push-worker"
cd "${BASE}/phase6"
SOUQ_API_IMAGE="$TAG" docker compose -f docker-compose.scale-prep.yml --profile push-worker up -d push-worker

deadline=$((SECONDS + 90))
until curl -fsS http://127.0.0.1:3001/api/push/vapid-public-key >/dev/null 2>&1; do
  (( SECONDS > deadline )) && { echo "FAIL vapid timeout"; exit 1; }
  sleep 2
done
echo "OK vapid endpoint live"

if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -h 127.0.0.1 ping | grep -q PONG && echo "OK redis ping"
fi

docker ps --format '{{.Names}} {{.Status}}' | grep -E 'push-worker|redis|api-api-1' || true
echo "P11_ACTIVATION_DONE tag=${TAG}"

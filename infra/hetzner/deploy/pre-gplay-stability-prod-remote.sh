#!/usr/bin/env bash
# Pre-Google-Play stability — Production API deploy. No secrets logged.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

TAG="${SOUQ_PRE_GPLAY_IMAGE:?SOUQ_PRE_GPLAY_IMAGE required}"
CTX=/opt/souq-arab/build-context
PROD_ENV=/opt/souq-arab/config/api.env.production
PROD_REF=nptfxtkedqndkgmrcntn
STAGING_REF=qkczposlooaldmsjfmun
LOG=/var/log/souq-arab/pre-gplay-stability.log

install -d -m 0755 "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "=== PRE-GPLAY STABILITY $(date -u +%Y-%m-%dT%H:%M:%SZ) tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || { echo "missing prod env"; exit 2; }
grep -q "$STAGING_REF" "$PROD_ENV" && { echo "REFUSE staging ref"; exit 2; }
grep -q "$PROD_REF" "$PROD_ENV" || { echo "REFUSE prod ref missing"; exit 2; }
bash /opt/souq-arab/scripts/check-production-env-ready.sh

sudo rm -rf "$CTX"
mkdir -p "$CTX"
tar -xzf /opt/souq-arab/build-context.tgz -C "$CTX"

grep -q adminRemoveListing "$CTX/artifacts/api-server/src/lib/ad-lifecycle.ts" || { echo "adminRemoveListing missing"; exit 2; }
grep -q bustConversationThreadCache "$CTX/artifacts/souq/src/features/p17-commerce/use-order-chat.ts" || { echo "order chat cache bust missing"; exit 2; }

echo "BUILD_START ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "${TAG}" .
echo "BUILD_OK ${TAG}"

docker run --rm "${TAG}" sh -c 'grep -rq adminRemoveListing /app/artifacts/api-server/dist/ || test -f /app/artifacts/api-server/dist/index.mjs'

DEPLOY_PUBLIC="/opt/souq-arab/scripts/deploy-production-public-api.sh"
if [[ ! -f "$DEPLOY_PUBLIC" ]]; then
  DEPLOY_PUBLIC="/opt/souq-arab/infra/hetzner/deploy/deploy-production-public-api.sh"
fi
if [[ ! -f "$DEPLOY_PUBLIC" ]]; then
  echo "FAIL missing deploy-production-public-api.sh"
  exit 2
fi

echo "DEPLOY_PRODUCTION_PUBLIC_START ${TAG}"
sudo bash "$DEPLOY_PUBLIC" --image "${TAG}" --skip-pull
echo "DEPLOY_PRODUCTION_PUBLIC_OK ${TAG}"

echo "PRE_GPLAY_STABILITY_DEPLOY_OK ${TAG}"

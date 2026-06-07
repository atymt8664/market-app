#!/usr/bin/env bash
# P17-7A — Production API deploy (git → docker → official deploy-api + prod-shadow sync).
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p17-7a-prod.log"
TAG="${SOUQ_P17_IMAGE:-souq-api:p17-7a-prod-$(date -u +%Y%m%d)}"
ORDERS_SRC="${CTX}/artifacts/api-server/src/routes/orders.ts"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-7A PROD start tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"

for key in P17_ORDERS_API_ENABLED P17_ORDERS_PRODUCTION_ALLOWED; do
  grep -qE "^${key}=1" "$PROD_ENV" 2>/dev/null || {
    grep -qE "^${key}=" "$PROD_ENV" 2>/dev/null && sed -i "s/^${key}=.*/${key}=1/" "$PROD_ENV" || echo "${key}=1" >>"$PROD_ENV"
  }
done
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

grep -q resolveCheckoutFulfillmentMode "${GIT_DIR}/artifacts/souq/src/features/p17-commerce/ad-fulfillment.ts" \
  || halt "P17-7A ad-fulfillment missing"
grep -q ShippingBuyerAddressInputSchema "${GIT_DIR}/artifacts/api-server/src/lib/p17/orders-schemas.ts" \
  || halt "P17-7A address schema missing"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"
grep -q start-preparing "$ORDERS_SRC" || halt "P17 routes missing"

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1
docker run --rm "$TAG" sh -c 'grep -q start-preparing /app/artifacts/api-server/dist/index.mjs' \
  >>"$LOG" 2>&1 || halt "dist missing handlers"

log ">> deploy-api.sh"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

log ">> prod-shadow sync"
export SOUQ_PROD_IMAGE="$TAG"
bash "${BASE}/scripts/phase8-release-deploy-prod-shadow.sh" >>"$LOG" 2>&1 || true
docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" up -d --force-recreate api-prod-shadow >>"$LOG" 2>&1
echo "$TAG" >"${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE"

SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
[[ -n "$SC" ]] || halt "prod-shadow missing"

docker exec "$SC" node -e "
const prod='${PROD_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(prod)) process.exit(3);
console.log('P17_API', process.env.P17_ORDERS_API_ENABLED==='1'?'on':'off');
" | tee -a "$LOG"

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

probe_post() {
  local path="$1"
  local code body
  code="$(curl -sS -o /tmp/p17-7a-probe.txt -w '%{http_code}' -X POST "https://api.souq-arab.com${path}" \
    -H 'content-type: application/json' -d '{}')"
  body="$(cat /tmp/p17-7a-probe.txt)"
  echo "$body" | grep -q 'Cannot POST' && halt "Cannot POST ${path}"
  log "ROUTE_OK ${path} HTTP ${code}"
}

probe_post "/api/orders"
probe_post "/api/orders/SOUQ-2026-000001/start-preparing"
probe_post "/api/orders/SOUQ-2026-000001/mark-shipped"

log "AUDIT CURRENT_TAG=$(cat ${BASE}/releases/CURRENT_TAG 2>/dev/null || echo none)"
log "AUDIT CURRENT_PROD_SHADOW=$(cat ${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
log "=== P17-7A PROD DEPLOY PASS tag=${TAG} ==="

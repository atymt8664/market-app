#!/usr/bin/env bash
# P17-7A — STAGING API deploy (git → docker → deploy-api with api.env.staging).
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
STAGING_ENV="${BASE}/config/api.env.staging"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p17-7a-staging.log"
TAG="${SOUQ_P17_STAGING_IMAGE:-souq-api:p17-7a-staging-$(date -u +%Y%m%d)}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-7A STAGING start tag=${TAG} ==="

[[ -f "$STAGING_ENV" ]] || halt "missing api.env.staging"
grep -q "$STAGING_REF" "$STAGING_ENV" || halt "STAGING ref missing"
grep -q "$PROD_REF" "$STAGING_ENV" && halt "PRODUCTION ref in staging env"

for key in P17_ORDERS_API_ENABLED P17_BUY_NOW_ENABLED; do
  grep -qE "^${key}=1" "$STAGING_ENV" 2>/dev/null || {
    grep -qE "^${key}=" "$STAGING_ENV" 2>/dev/null && sed -i "s/^${key}=.*/${key}=1/" "$STAGING_ENV" || echo "${key}=1" >>"$STAGING_ENV"
  }
done

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

grep -q resolveCheckoutFulfillmentMode "${GIT_DIR}/artifacts/souq/src/features/p17-commerce/ad-fulfillment.ts" \
  || halt "P17-7A ad-fulfillment missing"
grep -q p17-7a-pkg7-closure-verify "${GIT_DIR}/artifacts/api-server/package.json" \
  || halt "P17-7A pkg7 closure script missing"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

log ">> activate staging env"
bash "${BASE}/scripts/use-staging-env.sh" 2>/dev/null || ln -sf api.env.staging "${BASE}/config/api.env"

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1

log ">> deploy-api.sh (STAGING)"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3001${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

CID="$(docker ps --format '{{.Names}}' | grep -E 'api-api-1|api_api_1' | head -1)"
[[ -n "$CID" ]] || halt "STAGING API container missing"

docker exec "$CID" node -e "
const stg='${STAGING_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(stg)) process.exit(3);
console.log('P17_API', process.env.P17_ORDERS_API_ENABLED==='1'?'on':'off');
" | tee -a "$LOG"

log "=== P17-7A STAGING DEPLOY PASS tag=${TAG} ==="

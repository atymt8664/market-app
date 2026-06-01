#!/usr/bin/env bash
# P17-PROD-2 — Production API deploy (git → docker build → official deploy scripts). No SCP of app source.
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p17-prod-2.log"
TAG="${SOUQ_P17_PROD2_IMAGE:-souq-api:p17-prod-2-$(date -u +%Y%m%d)}"
ORDERS_SRC="${CTX}/artifacts/api-server/src/routes/orders.ts"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-PROD-2 start tag=${TAG} ==="

log "AUDIT CURRENT_TAG=$(cat ${BASE}/releases/CURRENT_TAG 2>/dev/null || echo none)"
log "AUDIT PREVIOUS_TAG=$(cat ${BASE}/releases/PREVIOUS_TAG 2>/dev/null || echo none)"
log "AUDIT CURRENT_PROD_SHADOW=$(cat ${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
log "AUDIT PREVIOUS_PROD_SHADOW=$(cat ${BASE}/releases/PREVIOUS_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"

set_prod_flag() {
  local key="$1"
  if grep -qE "^${key}=" "$PROD_ENV" 2>/dev/null; then
    sed -i "s/^${key}=.*/${key}=1/" "$PROD_ENV"
  else
    echo "${key}=1" >>"$PROD_ENV"
  fi
  grep -qE "^${key}=1" "$PROD_ENV" && log "FLAG_OK ${key}=1" || halt "flag ${key} not set"
}

log ">> git fetch source (no SCP)"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

for needle in start-preparing mark-shipped '"/orders/:id/accept"' '"/orders/:id/reject"' '"/orders/:id/cancel"' 'router.post("/orders"'; do
  grep -q "$needle" "${GIT_DIR}/artifacts/api-server/src/routes/orders.ts" \
    || halt "P17 routes missing in git source: ${needle}"
done
log "SOURCE_OK P17-5/6/7 routes present in git main"

log ">> sync build-context from git"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

[[ -f "$ORDERS_SRC" ]] || halt "orders.ts missing in build-context"
grep -q start-preparing "$ORDERS_SRC" || halt "build-context missing P17 routes"

log ">> enable P17 flags (api.env.production only)"
set_prod_flag "P17_ORDERS_API_ENABLED"
set_prod_flag "P17_ORDERS_PRODUCTION_ALLOWED"
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1

docker run --rm "$TAG" sh -c 'grep -q start-preparing /app/artifacts/api-server/dist/index.mjs 2>/dev/null || grep -rq start-preparing /app/artifacts/api-server/dist/' \
  >>"$LOG" 2>&1 || halt "built image missing P17 handlers in dist"

log ">> deploy-api.sh (official)"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

log ">> phase8 prod-shadow (official)"
SOUQ_PROD_IMAGE="$TAG" bash "${BASE}/scripts/phase8-release-deploy-prod-shadow.sh" >>"$LOG" 2>&1

SC="$(docker ps --format '{{.Names}}' | grep 'prod-shadow-api-prod-shadow' | head -1)"
[[ -n "$SC" ]] || halt "prod-shadow container missing"
export SOUQ_PROD_IMAGE="$TAG"
docker compose -f "${BASE}/phase7/docker-compose.production-shadow.yml" up -d --force-recreate api-prod-shadow >>"$LOG" 2>&1

docker exec "$SC" node -e "
const prod='${PROD_REF}';
const u=process.env.DATABASE_URL||'';
if(!u.includes(prod)) process.exit(3);
console.log('P17_API', process.env.P17_ORDERS_API_ENABLED==='1'?'on':'off');
console.log('P17_PROD', process.env.P17_ORDERS_PRODUCTION_ALLOWED==='1'?'on':'off');
" | tee -a "$LOG"

probe_post() {
  local path="$1"
  local code body
  code="$(curl -sS -o /tmp/p17-probe-body.txt -w '%{http_code}' -X POST "https://api.souq-arab.com${path}" \
    -H 'content-type: application/json' -d '{}')"
  body="$(cat /tmp/p17-probe-body.txt)"
  if echo "$body" | grep -q 'Cannot POST'; then
    log "ROUTE_FAIL ${path} Cannot POST"
    return 1
  fi
  log "ROUTE_OK ${path} HTTP ${code}"
  return 0
}

FAIL_ROUTES=0
probe_post "/api/orders" || FAIL_ROUTES=1
probe_post "/api/orders/SOUQ-2026-000001/accept" || FAIL_ROUTES=1
probe_post "/api/orders/SOUQ-2026-000001/reject" || FAIL_ROUTES=1
probe_post "/api/orders/SOUQ-2026-000001/cancel" || FAIL_ROUTES=1
probe_post "/api/orders/SOUQ-2026-000001/start-preparing" || FAIL_ROUTES=1
probe_post "/api/orders/SOUQ-2026-000001/mark-shipped" || FAIL_ROUTES=1
[[ "$FAIL_ROUTES" -eq 0 ]] || halt "route probes failed"

log "AUDIT_NEW CURRENT_TAG=$(cat ${BASE}/releases/CURRENT_TAG 2>/dev/null || echo none)"
log "AUDIT_NEW CURRENT_PROD_SHADOW=$(cat ${BASE}/releases/CURRENT_PROD_SHADOW_IMAGE 2>/dev/null || echo none)"
log "=== P17-PROD-2 DEPLOY PASS tag=${TAG} ==="

#!/usr/bin/env bash
# P17-9-17 — Production API deploy (platform broadcasts).
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p17-9-17-prod.log"
TAG="${SOUQ_P17_9_17_IMAGE:-souq-api:p17-9-17-$(date -u +%Y%m%d)}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P17-9-17 start tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

for needle in \
  "admin/broadcasts" \
  "broadcast.fanout" \
  "platform_broadcasts" \
  "025_p17_9_17_platform_broadcasts.sql"; do
  grep -rq "$needle" "${GIT_DIR}/" || halt "P17-9-17 source missing: ${needle}"
done
log "SOURCE_OK P17-9-17 markers present"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

log ">> apply migration 025"
bash "${CTX}/infra/hetzner/deploy/p17-9-17-prod-apply-migrations.sh" "$CTX" >>"$LOG" 2>&1

log ">> enable broadcast flags (test_audience prod verify only)"
if ! grep -q '^BROADCAST_ENABLED=' "$PROD_ENV"; then
  echo 'BROADCAST_ENABLED=1' >>"$PROD_ENV"
else
  sed -i 's/^BROADCAST_ENABLED=.*/BROADCAST_ENABLED=1/' "$PROD_ENV"
fi
if ! grep -q '^BROADCAST_PRODUCTION_ALLOWED=' "$PROD_ENV"; then
  echo 'BROADCAST_PRODUCTION_ALLOWED=1' >>"$PROD_ENV"
else
  sed -i 's/^BROADCAST_PRODUCTION_ALLOWED=.*/BROADCAST_PRODUCTION_ALLOWED=1/' "$PROD_ENV"
fi
# test audience uses PROD_SMOKE_EMAIL — never enable all-users on prod by default
grep -q '^BROADCAST_ALL_USERS_PRODUCTION=' "$PROD_ENV" || echo 'BROADCAST_ALL_USERS_PRODUCTION=0' >>"$PROD_ENV"

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1

docker run --rm "$TAG" sh -c 'grep -rq "admin/broadcasts" /app/artifacts/api-server/dist/' \
  >>"$LOG" 2>&1 || halt "built image missing admin/broadcasts"

log ">> deploy-api.sh"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

log "=== P17-9-17 deploy complete tag=${TAG} ==="

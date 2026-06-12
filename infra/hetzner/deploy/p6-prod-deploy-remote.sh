#!/usr/bin/env bash
# P6-CLOSURE-DEPLOY — Production API deploy (Security Hub + Privacy activity status).
set -euo pipefail

PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"
BASE="/opt/souq-arab"
PROD_ENV="${BASE}/config/api.env.production"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
REPO_URL="https://github.com/atymt8664/market-app.git"
LOG="/var/log/souq-arab/p6-prod.log"
TAG="${SOUQ_P6_IMAGE:-souq-api:p6-prod-$(date -u +%Y%m%d)}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
halt() { log "HALT: $*"; exit 2; }

[[ "$(id -u)" -eq 0 ]] || halt "run with sudo"
install -d -m 0755 "$(dirname "$LOG")"
log "=== P6 prod deploy start tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || halt "missing api.env.production"
grep -q "$STAGING_REF" "$PROD_ENV" && halt "STAGING ref in production env"
grep -q "$PROD_REF" "$PROD_ENV" || halt "PRODUCTION ref missing"
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1 || halt "check-production-env-ready failed"

log ">> git clone"
install -d -m 0755 "$(dirname "$GIT_DIR")"
rm -rf "$GIT_DIR"
git clone --depth 1 "$REPO_URL" "$GIT_DIR" >>"$LOG" 2>&1

for needle in \
  "account/security-alerts" \
  "account/privacy/activity" \
  "user_security_events" \
  "026_p6_user_2fa.sql" \
  "028_p6_privacy_activity_status.sql" \
  "listUserSecurityAlerts" \
  "presence_activity_visible"; do
  grep -rq "$needle" "${GIT_DIR}/" || halt "P6 source missing: ${needle}"
done
log "SOURCE_OK P6 markers present"

log ">> sync build-context"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"

log ">> apply migrations 026–028"
bash "${CTX}/infra/hetzner/deploy/p6-prod-apply-migrations.sh" "$CTX" >>"$LOG" 2>&1

log ">> docker build ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1

docker run --rm "$TAG" sh -c 'grep -rq "security-alerts" /app/artifacts/api-server/dist/' \
  >>"$LOG" 2>&1 || halt "built image missing security-alerts routes"

log ">> deploy-api.sh"
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1

for path in /api/healthz /api/readyz; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  log "PROBE ${path} HTTP ${code}"
  [[ "$code" == "200" ]] || halt "${path} not 200"
done

BUILD="$(curl -sS https://api.souq-arab.com/api/livez | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')"
log "LIVEZ_BUILD=${BUILD}"

log "=== P6 prod deploy complete tag=${TAG} ==="

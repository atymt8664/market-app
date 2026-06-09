#!/usr/bin/env bash
set -euo pipefail
TAG="souq-api:p17-prelaunch-2-imgfix-20260609b"
BASE="/opt/souq-arab"
CTX="${BASE}/build-context"
GIT_DIR="${BASE}/src/market-app"
LOG="/var/log/souq-arab/p17-prelaunch-2-imgfix.log"
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
log "=== P17-PRELAUNCH-2 image fix start tag=${TAG} ==="
bash "${BASE}/scripts/check-production-env-ready.sh" >>"$LOG" 2>&1
rm -rf "$GIT_DIR"
git clone --depth 1 https://github.com/atymt8664/market-app.git "$GIT_DIR" >>"$LOG" 2>&1
grep -q enrichListItemImage "${GIT_DIR}/artifacts/api-server/src/lib/p17/orders-service.ts"
rsync -a --delete "${GIT_DIR}/" "${CTX}/"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "$TAG" . >>"$LOG" 2>&1
bash "${BASE}/scripts/deploy-api.sh" --image "$TAG" --skip-pull >>"$LOG" 2>&1
bash "${BASE}/scripts/verify-deploy.sh" >>"$LOG" 2>&1
log "=== P17-PRELAUNCH-2 image fix PASS tag=${TAG} ==="

#!/usr/bin/env bash
# Start production shadow on 127.0.0.1:3002 only — STAGING :3001 and Railway unchanged.
set -euo pipefail
BASE="/opt/souq-arab"
COMPOSE="${BASE}/phase7/docker-compose.production-shadow.yml"
PROD_IMAGE="${SOUQ_PROD_IMAGE:-souq-api:production-candidate}"
PROD_REF="nptfxtkedqndkgmrcntn"
STAGING_REF="qkczposlooaldmsjfmun"

[[ "$(id -u)" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

bash "${BASE}/scripts/check-production-env-ready.sh" >/dev/null
grep -q "$STAGING_REF" "${BASE}/config/api.env.production" 2>/dev/null && { echo "REFUSE staging ref in production env"; exit 1; }
grep -q "$PROD_REF" "${BASE}/config/api.env.production" 2>/dev/null || { echo "REFUSE production ref missing"; exit 1; }

if docker images -q souq-api:staging-shadow-20260520 2>/dev/null | grep -q .; then
  docker tag souq-api:staging-shadow-20260520 "$PROD_IMAGE" 2>/dev/null || true
fi

export SOUQ_PROD_IMAGE="$PROD_IMAGE"
docker compose -f "$COMPOSE" up -d api-prod-shadow

for _ in $(seq 1 40); do
  curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:3002/api/healthz >/dev/null
echo "OK production shadow listening on 127.0.0.1:3002"

#!/usr/bin/env bash
# P11 — apply Redis networking fix + restart STAGING API/worker (no secrets).
set -euo pipefail
BASE="/opt/souq-arab"
TAG="${SOUQ_P11_IMAGE:-souq-api:staging-shadow-20260524-p11}"
ENV_FILE="${BASE}/config/api.env.staging"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
grep -vE '^(REDIS_URL|QUEUE_REDIS_URL)=' "$ENV_FILE" >"$tmp" || true
printf '%s\n' 'REDIS_URL=redis://host.docker.internal:6379' 'QUEUE_REDIS_URL=redis://host.docker.internal:6379' >>"$tmp"
install -m 600 -o deploy -g deploy "$tmp" "$ENV_FILE"

install -m 644 "${BASE}/phase6/docker-compose.scale-prep.yml" "${BASE}/phase6/docker-compose.scale-prep.yml.bak.$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true

cd "${BASE}/api/docker"
SOUQ_API_IMAGE="$TAG" docker compose --profile production up -d --force-recreate api

cd "${BASE}/phase6"
SOUQ_API_IMAGE="$TAG" docker compose -f docker-compose.scale-prep.yml --profile push-worker up -d --force-recreate push-worker

sleep 3
curl -fsS http://127.0.0.1:3001/api/push/vapid-public-key >/dev/null
echo P11_REDIS_FIX_DONE

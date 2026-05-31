#!/usr/bin/env bash
# P15-2 — STAGING job worker smoke on VPS loopback :3001 (no secrets).
set -u

BASE="/opt/souq-arab"
ENV_FILE="${SOUQ_ENV_FILE:-/opt/souq-arab/config/api.env.staging}"
STAGING_REF="qkczposlooaldmsjfmun"
PROD_REF="nptfxtkedqndkgmrcntn"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }

grep -q "$STAGING_REF" "$ENV_FILE" || { echo "REFUSE staging ref missing"; exit 2; }
grep -q "$PROD_REF" "$ENV_FILE" && { echo "REFUSE production ref in staging env"; exit 2; }

echo "=== P15-2 VPS STAGING job queue smoke ==="

CID="$(docker ps -q --filter 'name=souq-arab-api-api-1' | head -1)"
[[ -n "$CID" ]] || bad "STAGING API container not found"

if docker exec "$CID" test -f /app/artifacts/api-server/dist/worker/job-worker.mjs 2>/dev/null; then
  ok "job-worker.mjs present in image"
else
  bad "job-worker.mjs missing — deploy P15-2 image first"
fi

if docker exec "$CID" grep -q 'bootstrapJobWorker' /app/artifacts/api-server/dist/worker/job-worker.mjs 2>/dev/null; then
  ok "job-worker bundle contains bootstrapJobWorker"
else
  bad "job-worker bundle incomplete"
fi

JOB_QUEUE_ENABLED=1 docker exec "$CID" node /app/artifacts/api-server/scripts/validate-p15-2-queue-foundation.mjs 2>/dev/null \
  && ok "validate-p15-2 in container" \
  || bad "validate-p15-2 failed in container"

# Integrated smoke needs STAGING DATABASE_URL inside container env (api.env.staging)
if JOB_QUEUE_ENABLED=1 docker exec "$CID" node /app/artifacts/api-server/scripts/p15-2-staging-queue-smoke.mjs 2>/dev/null; then
  ok "integrated queue smoke"
else
  bad "integrated queue smoke (check JOB_QUEUE_ENABLED + STAGING DATABASE_URL)"
fi

[[ "$FAIL" -eq 0 ]] && echo "=== P15-2 VPS STAGING SMOKE: PASS ===" && exit 0
echo "=== P15-2 VPS STAGING SMOKE: FAIL ==="
exit 1

#!/usr/bin/env bash
# CHAT PACKAGE FINAL — remote steps on VPS (prod-shadow :3002). No secrets logged.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

TAG="${SOUQ_CHAT_IMAGE:?SOUQ_CHAT_IMAGE required}"
CTX=/opt/souq-arab/build-context
PROD_ENV=/opt/souq-arab/config/api.env.production
PROD_REF=nptfxtkedqndkgmrcntn
STAGING_REF=qkczposlooaldmsjfmun
LOG=/var/log/souq-arab/chat-package-final.log
PSQL_IMAGE="${SOUQ_PSQL_IMAGE:-postgres:16-alpine}"

install -d -m 0755 "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "=== CHAT PACKAGE FINAL $(date -u +%Y-%m-%dT%H:%M:%SZ) tag=${TAG} ==="

[[ -f "$PROD_ENV" ]] || { echo "missing prod env"; exit 2; }
grep -q "$STAGING_REF" "$PROD_ENV" && { echo "REFUSE staging ref"; exit 2; }
grep -q "$PROD_REF" "$PROD_ENV" || { echo "REFUSE prod ref missing"; exit 2; }
bash /opt/souq-arab/scripts/check-production-env-ready.sh

sudo rm -rf "$CTX"
mkdir -p "$CTX"
tar -xzf /opt/souq-arab/build-context.tgz -C "$CTX"

DATABASE_URL_RAW="$(grep -E '^DATABASE_URL=' "$PROD_ENV" | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
[[ -n "$DATABASE_URL_RAW" ]] || { echo "DATABASE_URL missing"; exit 2; }
DATABASE_URL="$(printf '%s' "$DATABASE_URL_RAW" | sed -E 's/[?&]uselibpqcompat=[^&]*//g; s/\?&/?/g; s/&$//; s/\?$//')"

docker image inspect "$PSQL_IMAGE" >/dev/null 2>&1 || docker pull "$PSQL_IMAGE"

psql_query() {
  docker run --rm -i -e PGSSLMODE=require "$PSQL_IMAGE" psql "$DATABASE_URL" -tAc "$1"
}

psql_file() {
  local sql_path="$1"
  docker run --rm -i -e PGSSLMODE=require -v "$(dirname "$sql_path"):/sql:ro" "$PSQL_IMAGE" \
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "/sql/$(basename "$sql_path")"
}

for mig in 029_conversation_ad_references.sql 030_p5_conversation_deletes.sql; do
  SQL="$CTX/lib/db/migrations/$mig"
  [[ -f "$SQL" ]] || { echo "missing $SQL"; exit 2; }
  table=""
  case "$mig" in
    029*) table=conversation_ad_references ;;
    030*) table=conversation_deletes ;;
  esac
  exists="$(psql_query "SELECT to_regclass('public.${table}') IS NOT NULL" 2>/dev/null || echo f)"
  if [[ "$exists" == "t" ]]; then
    echo "SKIP migration $mig ($table exists)"
  else
    echo "APPLY migration $mig via docker $PSQL_IMAGE"
    psql_file "$SQL"
    echo "OK migration $mig"
  fi
done

grep -q conversationDeletesTable "$CTX/artifacts/api-server/src/routes/conversations.ts" || { echo "delete-for-me code missing"; exit 2; }
grep -q delete-for-me "$CTX/lib/api-spec/openapi.yaml" || { echo "openapi delete-for-me missing"; exit 2; }

PREV_IMAGE=""
if docker compose -f /opt/souq-arab/phase7/docker-compose.production-shadow.yml ps -q api-prod-shadow 2>/dev/null | grep -q .; then
  PREV_IMAGE="$(docker inspect souq-arab-api-prod-shadow-api-prod-shadow-1 --format '{{.Config.Image}}' 2>/dev/null || true)"
fi
echo "PREV_PROD_SHADOW_IMAGE=${PREV_IMAGE:-none}"

echo "BUILD_START ${TAG}"
cd "$CTX"
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t "${TAG}" .
echo "BUILD_OK ${TAG}"

docker run --rm "${TAG}" sh -c 'grep -q delete-for-me /app/artifacts/api-server/dist/index.mjs'
docker run --rm "${TAG}" sh -c 'grep -q restore-for-me /app/artifacts/api-server/dist/index.mjs'

echo "DEPLOY_PROD_SHADOW_START ${TAG}"
sudo SOUQ_PROD_IMAGE="${TAG}" bash /opt/souq-arab/scripts/phase8-release-deploy-prod-shadow.sh
echo "DEPLOY_PROD_SHADOW_OK ${TAG}"

# Loopback smoke
for path in /api/healthz /api/readyz /api/categories; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3002${path}")"
  echo "LOOPBACK http://127.0.0.1:3002${path} HTTP ${code}"
  [[ "$code" == "200" ]] || { echo "FAIL loopback $path"; exit 2; }
done

for route in delete-for-me restore-for-me; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:3002/api/conversations/1/${route}")"
  echo "LOOPBACK POST /api/conversations/1/${route} HTTP ${code}"
  if [[ "$code" == "404" ]]; then
    echo "FAIL route missing: ${route}"
    exit 2
  fi
done

for path in /api/healthz /api/readyz /api/categories; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://api.souq-arab.com${path}")"
  echo "PUBLIC https://api.souq-arab.com${path} HTTP ${code}"
  [[ "$code" == "200" ]] || { echo "FAIL public $path"; exit 2; }
done

echo "CHAT_PACKAGE_FINAL_DEPLOY_OK ${TAG}"

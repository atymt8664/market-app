#!/usr/bin/env bash
# STAGING only: start local Redis, ping, stop — proves scale path without touching API env.
set -euo pipefail
COMPOSE_SCALE="/opt/souq-arab/phase6/docker-compose.scale-prep.yml"
STAGING_REF="qkczposlooaldmsjfmun"

if grep -q 'nptfxtkedqndkgmrcntn' /opt/souq-arab/config/api.env.staging 2>/dev/null; then
  echo "REFUSE: production ref in staging env" >&2
  exit 1
fi
grep -q "$STAGING_REF" /opt/souq-arab/config/api.env.staging 2>/dev/null || {
  echo "REFUSE: staging ref missing" >&2
  exit 1
}

cd /opt/souq-arab/phase6
docker compose -f "$COMPOSE_SCALE" up -d redis
for _ in $(seq 1 20); do
  docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && break
  sleep 1
done
docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli ping | grep -q PONG
docker compose -f "$COMPOSE_SCALE" down
echo "OK redis spike"

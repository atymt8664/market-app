#!/usr/bin/env bash
# STAGING only: start local Redis on loopback, smoke test, leave running — no API env changes.
set -euo pipefail
COMPOSE_SCALE="/opt/souq-arab/phase6/docker-compose.scale-prep.yml"
STAGING_REF="qkczposlooaldmsjfmun"
KEEP_RUNNING="${SOUQ_REDIS_SPIKE_KEEP:-1}"

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

if ss -tln 2>/dev/null | grep -E ':6379\b' | grep -qv '127.0.0.1:6379'; then
  echo "REFUSE: redis exposed beyond loopback" >&2
  exit 1
fi
ss -tln 2>/dev/null | grep -q '127.0.0.1:6379' || {
  echo "REFUSE: redis not listening on loopback" >&2
  exit 1
}

docker compose -f "$COMPOSE_SCALE" exec -T redis sh -c '
  timeout 5 redis-cli SUBSCRIBE souq:p16:pubsub:smoke > /tmp/sub.out 2>&1 &
  SPID=$!
  sleep 1
  redis-cli PUBLISH souq:p16:pubsub:smoke ready >/dev/null
  sleep 1
  grep -q ready /tmp/sub.out
  kill "$SPID" 2>/dev/null || true
  rm -f /tmp/sub.out
' || {
  echo "REFUSE: pubsub smoke failed" >&2
  exit 1
}

docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli DEL souq:p16:queue:smoke >/dev/null
docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli LPUSH souq:p16:queue:smoke smoke >/dev/null
docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli RPOP souq:p16:queue:smoke | grep -q smoke
docker compose -f "$COMPOSE_SCALE" exec -T redis redis-cli DEL souq:p16:queue:smoke >/dev/null

if [[ "$KEEP_RUNNING" == "0" ]]; then
  docker compose -f "$COMPOSE_SCALE" down
fi

echo "OK redis spike"

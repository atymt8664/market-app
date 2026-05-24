# Scale roadmap (VPS-first, minimal external services)

## Current (Phase 1–6)

- Single API container on loopback
- Supabase Postgres + Storage
- Nginx edge rate limits
- In-process WebSocket

## Phase 7+ (recommended order)

1. **Redis (127.0.0.1)** — session cache, rate-limit buckets, WS pub/sub across replicas
2. **Queue worker** — BullMQ or pg-boss on same VPS; notifications, emails, image post-process
3. **Second API replica** — behind Nginx upstream after Redis pub/sub proven on STAGING
4. **Read replicas** — Supabase scaling (when traffic warrants)

## Targets (engineering goals)

| Load | Direction |
|------|-----------|
| 1M+ ads | FTS indexes + read paths cached |
| 1M+ messages/day | queue + worker pool |
| 1M+ notifications/day | fan-out via queue, batch delivery |
| 10k+ concurrent WS | Redis adapter + horizontal API |

## STAGING spike

`phase6-staging-redis-spike.sh` starts Redis on `127.0.0.1:6379`, runs ping/pubsub/queue smokes, and leaves the container running (`restart: unless-stopped`) without enabling Redis in the API yet.

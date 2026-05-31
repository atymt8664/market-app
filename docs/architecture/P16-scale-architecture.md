# P16 — Scale Architecture

| Field | Value |
|-------|-------|
| **Code** | P16 |
| **Status** | STAGING spike complete — Redis loopback running on VPS (`qkczposlooaldmsjfmun`) |

---

## الهدف / Goal

**Horizontal scale** without architectural collapse: Redis, pub/sub, multiple API instances (API-1/2/3), connection pooling strategy, read replicas, and load baselines.

---

## المسؤوليات / Responsibilities

- Redis on loopback (sessions cache, rate buckets, WS pub/sub)
- Nginx upstream for multiple API backends
- PG pool tuning (`PG_POOL_MAX`) across replicas
- WebSocket adapter for multi-instance (**P5**)
- STAGING spikes and load baselines before PRODUCTION
- Scale roadmap maintenance

---

## الملفات التابعة / Owned paths

| Path | Purpose |
|------|---------|
| `infra/hetzner/phase6/SCALE-ROADMAP.md` | Official growth order |
| `infra/hetzner/phase6/docker-compose.scale-prep.yml` | Redis compose prep |
| `infra/hetzner/phase6/phase6-staging-redis-spike.sh` | STAGING Redis validation |
| `lib/db/src/pool-config.ts` | Pool sizing |
| `artifacts/api-server/src/lib/realtime.ts` | Future Redis adapter |
| `phase5-*-baseline*.sh`, `phase5-staging-load-smoke.sh` | Baselines |

---

## ما المسموح تعديله / Allowed changes

- STAGING scale experiments
- Pool limits and nginx upstream config
- Documentation and checklists

---

## ما الممنوع تعديله / Forbidden changes

- PRODUCTION multi-replica without STAGING proof + rollback
- Product features disguised as “scale fixes”
- Skipping queue layer (**P15**) when async backlog appears

---

## Boundaries

- **Capacity layer** — no domain business rules

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | Infra, nginx |
| **P1** | Env |
| **P5** | WS scaling |
| **P9** | Latency targets |
| **P15** | Queue backend (Phase 1: pg-boss; Phase 2: BullMQ when triggered) |

---

## Owner scope

- **Primary:** **Developer E** (+ Platform lead)

---

## Scalability notes

### Approved growth path

```
VPS (single API)
  → pg-boss queue worker (P15 Phase 1)
  → Redis (127.0.0.1) — sessions, rate limits, WS pub/sub
  → BullMQ queue (P15 Phase 2 — only when trigger metrics met; see P15-background-jobs.md)
  → Second API replica (nginx upstream)
  → Read replicas (Supabase)
  → Horizontal scale / multi-region (long-term)
```

### Targets (from SCALE-ROADMAP)

| Load | Direction |
|------|-----------|
| 1M+ ads | FTS + cache + optional dedicated search |
| 1M+ messages/day | Queue + worker pool |
| 1M+ notifications/day | Fan-out via queue |
| 10k+ concurrent WS | Redis adapter + horizontal API |

---

## Future roadmap

- Complete Redis spike on STAGING (`qkczposlooaldmsjfmun`)
- WS Redis adapter in `realtime.ts`
- API-2 behind nginx on STAGING
- Supabase read replica for browse/search

---

## Testing requirements

- `phase6-staging-redis-spike.sh` — STAGING only
- `phase5-staging-load-smoke.sh`, `phase5-collect-baseline.sh`
- WS probe with 2 API instances on STAGING
- Pool config tests: `pnpm --filter @workspace/db run test:pool-config`

---

## Security notes

- Redis bound to loopback unless TLS tunnel approved
- No cross-tenant data in shared cache keys — include user/id namespace

---

## Related legacy phase paths

| Legacy | Role |
|--------|------|
| `phase6/SCALE-ROADMAP.md` | Canonical order (references legacy “Phase 7+” — interpret as **P16** milestones) |
| `phase5/` | Baseline + load smoke |
| `phase7/` | Prod shadow ( **P0** execution, **P16** validation) |

---

## i18n namespace

N/A.

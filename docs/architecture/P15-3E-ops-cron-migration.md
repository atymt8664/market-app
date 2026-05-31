# P15-3E — Cron / Operations Jobs Migration

| Field | Value |
|-------|-------|
| **Code** | P15-3E |
| **Status** | ✅ Closed — STAGING ops cron + anti-pattern fix |
| **Authority** | [P15-background-jobs.md](./P15-background-jobs.md) |
| **Date** | 2026-05-31 |

---

## Executive decision

Migrate **SLA auto-escalation** from admin-read side effect to **pg-boss scheduled job** on STAGING. Keep PRODUCTION on synchronous fallback until approved cutover.

**Deferred (not P15-3E):**

| Item | Phase | Reason |
|------|-------|--------|
| Analytics daily rollup | **P15-3F** | Separate scope |
| Account deletion storage purge | **P15-3G** | Separate scope |
| Expire ads cron | Future | Not implemented |
| Search bulk reindex | P14 | Maintenance wave |

---

## Root cause

| # | Root cause | Fix |
|---|------------|-----|
| 1 | `runAutoEscalationAll()` invoked on **every admin read** (10 call sites) | STAGING: skip via `ensureSlaEscalationBeforeAdminRead()` when `OPS_CRON_ENABLED` |
| 2 | No scheduler foundation in pg-boss worker | `scheduler.ts` + `bootstrapJobSchedules()` |
| 3 | SLA escalation is operational, not request-scoped | `ops.sla_escalate` cron every 10m (configurable) |
| 4 | Monitoring snapshot also ran escalation inline | Same guard applied |

---

## Operations inventory (diagnosis)

| Operation | Trigger today | Should be | P15-3E |
|-----------|---------------|-----------|--------|
| **SLA auto-escalation** | Admin page/API read | Cron worker | ✅ Migrated (STAGING) |
| Admin queue counts | On read | On read (read-only) | Stays sync |
| Staff load snapshot | On read | On read | Stays sync |
| NOC monitoring snapshot | On read (+ escalation) | On read only | ✅ Fixed |
| Analytics rollups (~27 queries) | On admin poll | Cron | → P15-3F |
| Account deletion purge | On delete request | Async job | → P15-3G |
| Ad expire / cleanup | Not implemented | Future cron | N/A |
| Push delivery | Already outbox P15-3C | Worker | Unchanged |
| Email / notify outbox | P15-3A/B | Worker | Unchanged |
| Search FTS trigger | DB trigger | DB (correct) | N/A |
| Session expire | connect-pg-simple | DB | N/A |

### Admin read call sites (pre-fix)

| File | Calls |
|------|-------|
| `routes/admin-operations.ts` | 4 |
| `routes/ads.ts` | 2 |
| `routes/support.ts` | 2 |
| `routes/admin-reports-workflow.ts` | 1 |
| `lib/admin-monitoring-snapshot.ts` | 1 |

---

## What was migrated

| Job | Type | Priority | Retry | DLQ |
|-----|------|----------|-------|-----|
| `ops.sla_escalate` | Cron `*/10 * * * *` (default) | normal (2) | Standard 5× | `system.dead_letter` |

**STAGING gate:** `JOB_QUEUE_ENABLED=1` + `OPS_CRON_ENABLED=1` + STAGING ref.

**PRODUCTION:** `ensureSlaEscalationBeforeAdminRead()` → sync `runAutoEscalationAll()` (unchanged).

---

## Scheduler architecture

```
job-worker.ts
    ↓ bootstrapJobWorker()
startQueueModule() → ensureRegisteredQueues()
    ↓
bootstrapJobSchedules(boss)
    ↓ (STAGING + OPS_CRON_ENABLED)
boss.schedule("ops.sla_escalate", cron, envelope, { key, retry, deadLetter })
    ↓ every cron tick
boss.work("ops.sla_escalate") → runAutoEscalationAll()
    ↓
4 domain UPDATE batches (verification, reports, support, ads)
```

**Schedule key:** `ops.sla_escalate.staging` — idempotent on worker restart.

**Env overrides:**

| Env | Default | Purpose |
|-----|---------|---------|
| `OPS_CRON_ENABLED` | `1` on STAGING | Gate cron + skip admin-read escalation |
| `OPS_SLA_ESCALATE_CRON` | `*/10 * * * *` | Cron expression |

---

## Worker flow

1. Worker starts → registers 7 handlers (incl. `ops.sla_escalate`)
2. Schedules registered via pg-boss timekeeper
3. Cron fires → job enqueued → worker processes
4. Handler calls `runAutoEscalationAll()` → logs per-domain counts
5. Metrics: `opsMetrics` in `collectQueueHealthSnapshot()`

---

## Retry / DLQ flow

Same as P15-2 standard policy:

| Attempt | Backoff |
|---------|---------|
| 1 | immediate |
| 2 | 30s |
| 3 | 2m |
| 4 | 10m |
| 5 | 1h → **DLQ** |

Queue seed: `ops.sla_escalate` → `deadLetter: system.dead_letter`.

---

## Rollback

1. Set `OPS_CRON_ENABLED=0` on STAGING → admin reads resume sync escalation
2. Revert commit → restore inline `runAutoEscalationAll()` calls
3. `boss.unschedule("ops.sla_escalate", key)` on worker restart after revert

No PRODUCTION impact — sync path preserved.

---

## Verification

- `npm run p15-3e:validate` — static checks
- `npm run p15-3e:staging-smoke` — schedule + manual enqueue dry run
- `npm test` — unit tests incl. `ops-cron.test.mjs`, `registry.test.mjs`

---

## Next gate

**P15-3F** — Analytics daily rollup cron (do not open until P15-3E closed).

# P15-4 — Production Hardening & Worker Operations

| Field | Value |
|-------|-------|
| **Code** | P15-4 |
| **Status** | ✅ Closed — STAGING operations hardening (no PRODUCTION cutover) |
| **Authority** | [P15-background-jobs.md](./P15-background-jobs.md) |
| **Date** | 2026-05-31 |

---

## Executive decision

Close the **operational gap** between P15-3 STAGING job migrations and production-ready worker operations:

- Fix incorrect pg-boss monitoring (was Redis proxy)
- Fix DLQ listing bug (failed-only filter)
- Add DLQ replay foundation + admin STAGING ops routes
- Harden worker lifecycle (process guards, shutdown)
- Document runbook + STAGING docker-compose reference

**No PRODUCTION cutover.** PRODUCTION continues sync paths + legacy push-worker.

---

## Root cause

| # | Root cause | Fix |
|---|------------|-----|
| 1 | `queueWorker` health used Redis depth as proxy | `probePgBossJobQueue()` reads pg-boss queue stats |
| 2 | `listDeadLetterJobs` filtered `state=failed` only | DLQ jobs are `created` — fixed to `queued: true` |
| 3 | No DLQ replay path | `dlq-replay.ts` + admin routes (STAGING, Founder) |
| 4 | Envelope lacked source queue for replay | `jobName` on `JobEnvelope` at enqueue |
| 5 | No worker ops runbook / health probe | Runbook + docker healthcheck script |
| 6 | Single `job-worker.ts` process — no prod deploy yet | STAGING docker-compose reference only |

---

## Worker inventory

| Worker (logical) | Runtime | STAGING | PRODUCTION |
|------------------|---------|---------|------------|
| **Email** | `job-worker` handler `auth.otp`, `auth.reset` | pg-boss outbox | Sync `lib/email.ts` |
| **Notification** | `notify.in_app` | pg-boss outbox | Sync INSERT |
| **Push** | `push.deliver` + legacy `push-worker.ts` (Redis) | pg-boss + Redis fallback | Redis LIST only |
| **SLA / Ops** | `ops.sla_escalate` cron | pg-boss cron | Sync on admin read |
| **Analytics** | `analytics.daily` cron | pg-boss cron | Live compute |
| **Media purge** | `media.purge` event | pg-boss outbox | Sync purge |

**Unified pg-boss worker:** `artifacts/api-server/src/job-worker.ts` → 9 handlers.

**Legacy push worker:** `artifacts/api-server/src/push-worker.ts` (Redis BLPOP) — preserved.

---

## Worker lifecycle

| Phase | Behavior |
|-------|----------|
| **Startup** | `bootstrapJobWorker()` → env guard → register handlers → `startQueueModule()` → cron schedules → `boss.work()` |
| **Shutdown** | SIGTERM/SIGINT → `offWork()` all queues → `boss.stop({ graceful, timeout: 30s })` |
| **Restart** | Process supervisor (docker/systemd) restarts container; pg-boss resumes polling |
| **Crash recovery** | pg-boss marks expired active jobs failed → retry → DLQ after 5 attempts |
| **Process guards** | `unhandledRejection` logged; `uncaughtException` → exit(1) |

---

## DLQ strategy

- Central queue: `system.dead_letter`
- All business queues: `deadLetter: system.dead_letter`, `retryLimit: 5`, exponential backoff
- Failed jobs land in DLQ as **new created jobs** with original envelope in `data`
- Ops list via `GET /admin/jobs/dlq` (STAGING, Founder)

---

## Replay strategy

1. Envelope must include `jobName` (all new enqueues from P15-4)
2. `POST /admin/jobs/dlq/:jobId/replay` (STAGING, Founder, CSRF)
3. Re-enqueue to source queue with `:replay:{timestamp}` idempotency suffix
4. Delete DLQ job after successful re-enqueue
5. Legacy DLQ jobs without `jobName` → replay rejected (manual ops)

---

## Health strategy

| Layer | Mechanism |
|-------|-----------|
| API liveness | `/healthz`, `/readyz` (unchanged) |
| pg-boss probe | `probePgBossJobQueue()` — depth, DLQ, schema version |
| Admin monitoring | `/admin/monitoring` — pgBoss metrics + alerts |
| Admin jobs health | `GET /admin/jobs/health` (Founder) |
| Worker docker | `p15-4-worker-health-probe.mjs` (STAGING compose reference) |

**Alert thresholds:** queue depth ≥100 warning, ≥1000 critical; DLQ ≥10 warning, ≥50 critical.

---

## Operational gaps (remaining post-P15-4)

| Gap | Phase |
|-----|-------|
| PRODUCTION worker deploy + cutover | Future — requires explicit approval |
| Admin UI panel for DLQ replay | P8 enhancement (API foundation ready) |
| BullMQ Phase 2 | P16 trigger metrics |
| Separate worker containers per type | Scale when depth metrics justify |
| Redis LIST decommission | Post PRODUCTION push unification |

---

## Files

| File | Role |
|------|------|
| `src/lib/jobs/dlq-replay.ts` | DLQ list + replay |
| `src/lib/jobs/job-queue-probe.ts` | pg-boss health probe |
| `src/routes/admin-jobs.ts` | STAGING admin ops API |
| `src/lib/admin-infrastructure-health.ts` | Fixed pg-boss monitoring |
| `infra/hetzner/phase6/docker-compose.job-worker-staging.yml` | STAGING deploy reference |

---

## Verification

| Check | Command |
|-------|---------|
| Static validate | `npm run p15-4:validate` |
| Unit tests | `npm test` |
| STAGING smoke | `npm run p15-4:staging-smoke` |

---

## Rollback

1. Revert P15-4 commits — monitoring falls back to prior snapshot shape (Redis proxy removed — prefer revert deploy)
2. Disable admin job routes by reverting `admin-jobs.ts` registration
3. `JOB_QUEUE_ENABLED=0` on STAGING → sync paths restored (P15-3 gates)

---

## P15 wave closure

**P15-4 ✅ Closed** — P15 implementation wave complete (P15-1 through P15-4).

**P17 blocked** until explicit next-phase approval per PROJECT_STATE.

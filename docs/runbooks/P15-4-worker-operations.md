# P15-4 — Worker Operations Runbook

**Scope:** STAGING pg-boss job-worker (`job-worker.ts`). **No PRODUCTION cutover.**

**Env refs:** STAGING `qkczposlooaldmsjfmun` · PRODUCTION `nptfxtkedqndkgmrcntn` — never mix.

---

## Processes

| Process | Command | Role |
|---------|---------|------|
| **API** | `npm run start` | HTTP + producers (outbox enqueue) |
| **Job worker** | `npm run start:job-worker` | pg-boss consumer (9 handlers) |
| **Push worker (legacy)** | `npm run start:push-worker` | Redis LIST push delivery (PRODUCTION path) |

---

## Required env (job-worker STAGING)

```
JOB_QUEUE_ENABLED=1
DATABASE_URL=<STAGING ref only>
# Outbox gates as needed:
EMAIL_OUTBOX_ENABLED=1
NOTIFICATION_OUTBOX_ENABLED=1
PUSH_OUTBOX_ENABLED=1
OPS_CRON_ENABLED=1
ANALYTICS_ROLLUP_ENABLED=1
PURGE_OUTBOX_ENABLED=1
```

**Blocked on PRODUCTION:** `JOB_QUEUE_PRODUCTION_ALLOWED` must NOT be set unless explicitly approved.

---

## Startup checklist

1. Confirm `DATABASE_URL` contains STAGING ref
2. Set `JOB_QUEUE_ENABLED=1`
3. Start worker: `npm run start:job-worker`
4. Log must show: `P15 job worker ready` with `handlerCount: 9`
5. Run smoke: `npm run p15-4:staging-smoke`

---

## Graceful shutdown

1. Send SIGTERM to worker process
2. Expected logs: `P15 job worker shutting down gracefully` → `P15 job worker stopped`
3. Timeout: 30s (in-flight jobs complete or pg-boss expires)

**Do not** kill -9 during active media.purge unless emergency — storage cleanup may be partial (best-effort).

---

## Health verification

| Check | How |
|-------|-----|
| Process up | Supervisor / docker ps |
| pg-boss reachable | `npm run p15-4:worker-health-probe` |
| Queue depth | `GET /admin/jobs/health` (Founder) or `/admin/monitoring` |
| Handler attachment | Worker startup logs list 9 `workId`s |

---

## Queue monitoring

**Admin monitoring** (`/admin/monitoring`):

- `queueMetrics.pgBoss.queueDepth` — total queued + deferred
- `queueMetrics.pgBoss.dlqDepth` — dead-letter backlog
- Alerts: `pg_boss_queue` warning/critical

**Thresholds:**

- Queue depth ≥ 100 → warning
- Queue depth ≥ 1000 → critical
- DLQ ≥ 10 → warning
- DLQ ≥ 50 → critical

---

## DLQ operations (STAGING only)

### List DLQ jobs

```
GET /api/admin/jobs/dlq?limit=25
```

Requires: Founder, admin session, STAGING env on API.

### Replay a DLQ job

```
POST /api/admin/jobs/dlq/{jobId}/replay
```

Requires: Founder, CSRF token, STAGING env.

**Preconditions:**

- Job envelope includes `jobName` (jobs enqueued after P15-4)
- Handler for source queue must be idempotent

**After replay:**

- New job appears on source queue
- DLQ entry removed
- Check worker logs for processing

### Jobs without replay metadata

Legacy DLQ entries without `jobName` cannot be auto-replayed. Options:

1. Manual fix + new enqueue via smoke script pattern
2. Discard via pg-boss admin SQL (STAGING only, with audit)

---

## Failure handling

| Scenario | Action |
|----------|--------|
| Worker down | Jobs accumulate in Postgres; API still enqueues (STAGING outbox); no user data loss |
| Worker crash mid-job | pg-boss retry (up to 5×) → DLQ |
| DLQ growing | Investigate handler logs; fix root cause; replay when safe |
| Enqueue failure (account purge) | Sync fallback runs automatically |
| PRODUCTION | Sync paths — worker outage N/A for pg-boss |

---

## Docker (STAGING reference)

File: `infra/hetzner/phase6/docker-compose.job-worker-staging.yml`

```bash
docker compose -f docker-compose.job-worker-staging.yml up -d
```

Uses `api.env.staging` on VPS. **Not deployed to PRODUCTION.**

---

## Smoke & validate scripts

```bash
cd artifacts/api-server
npm run p15-4:validate
npm run p15-4:staging-smoke
npm run p15-4:worker-health-probe
```

---

## Rollback

1. Stop job-worker container/process
2. Set outbox env flags to `0` → API uses sync fallbacks
3. Revert deploy if monitoring/regression

---

## Related docs

- [P15-4-production-hardening.md](../architecture/P15-4-production-hardening.md)
- [P15-background-jobs.md](../architecture/P15-background-jobs.md)
- [P15-2-staging-queue-smoke.md](./P15-2-staging-queue-smoke.md)

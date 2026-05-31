# P15-3F — Analytics Rollups & Metrics Jobs

| Field | Value |
|-------|-------|
| **Code** | P15-3F |
| **Status** | ✅ Closed — STAGING daily analytics rollup |
| **Authority** | [P15-background-jobs.md](./P15-background-jobs.md) |
| **Date** | 2026-05-31 |

---

## Executive decision

Migrate **`/admin/stats` + `/admin/analytics`** heavy aggregation (~27 parallel queries × period) to **daily precomputed rollups** on STAGING via `analytics.daily` pg-boss cron.

**Keep sync on read** for operational, live, and RBAC-scoped metrics.

**Deferred:** Dashboard NOC overlap rollup (partial duplicate queries) — future optimization only if metrics prove hot.

---

## Root cause

| # | Root cause | Fix |
|---|------------|-----|
| 1 | `handleAdminAnalytics` runs ~27 parallel DB queries **per request** | Daily worker precomputes 4 periods → `admin_analytics_daily_rollups` |
| 2 | Same aggregation logic not reusable | Extracted `computeAdminAnalyticsPayload()` |
| 3 | No rollup storage | `admin_analytics_daily_rollups` JSONB table |
| 4 | P15 doc listed analytics cron gap | `analytics.daily` @ 02:00 UTC on STAGING |

---

## Analytics inventory

| Surface | Route / Module | Queries (approx) | Frequency | Rollup? |
|---------|----------------|------------------|-----------|---------|
| **Admin analytics** | `GET /admin/stats`, `/admin/analytics` | **~27 parallel** | Per page open | ✅ **Yes** |
| Admin dashboard | `GET /admin/dashboard` | ~20+ (+ NOC) | High | ❌ Stay sync (operational lists + badges) |
| NOC snapshot | `buildAdminNocSnapshot` | ~11 DB | Dashboard load | ❌ Stay sync (live 5m/1h windows) |
| Monitoring snapshot | `buildAdminMonitoringSnapshot` | ~7 parallel + infra | P8 monitoring poll | ❌ Stay sync (live tier) |
| Ops queue stats | `/admin/operations/*` | 8× domains | Staff workflow | ❌ Stay sync (RBAC + SLA queues) |
| Domain stats | ads/reports/support/verification stats | 1 aggregate each | Module pages | ❌ Stay sync (simple COUNT, RBAC) |
| Staff load | `getStaffLoadSnapshot` | O(staff) | Founder view | ❌ Stay sync |
| Observability | `/observability/metrics` | In-memory | Admin/debug | ❌ Stay sync |
| Push queue metrics | Redis/pg-boss read | 1 | Monitoring | ❌ Stay sync |
| Revenue / plans | RBAC only | N/A | — | **Not implemented** |
| Trust metrics | trust-safety inline | Per action | — | ❌ Not aggregate dashboard |

---

## What stays sync

| Path | Reason |
|------|--------|
| Dashboard lists (latest reports, top ads) | User expects fresh rows |
| NOC live windows (5m active users) | Must be realtime |
| Monitoring / infra health | P8 live tier contract |
| Ops / verification queue counts | Operational SLA accuracy |
| PRODUCTION analytics | No cutover in P15-3F |

---

## What moves to rollups (STAGING)

| Job | Schedule | Storage |
|-----|----------|---------|
| `analytics.daily` | `0 2 * * *` UTC (default) | `admin_analytics_daily_rollups` |

**Periods precomputed:** `today`, `7d`, `30d`, `all`

**API path (STAGING + `ANALYTICS_ROLLUP_ENABLED`):**
`resolveAdminAnalytics(period)` → read today's rollup → fallback to live compute if missing.

**JSON contract unchanged** — same response shape; only `generatedAt` refreshed on read.

---

## Job definitions

```typescript
ANALYTICS_JOB_TYPES.DAILY = "analytics.daily"

Payload: { trigger: "cron" | "manual" | "smoke", dryRun?: boolean }
Result:  { periodsWritten: 4, snapshotDate: "YYYY-MM-DD" }
Priority: low (3)
Retry: standard 5× → DLQ
```

---

## Scheduler architecture

```
bootstrapJobSchedules()
  → registerOpsSchedules()        // P15-3E
  → registerAnalyticsSchedules()  // P15-3F
      boss.schedule("analytics.daily", "0 2 * * *", envelope, { key: "analytics.daily.staging" })
```

**Env:**

| Env | Default | Purpose |
|-----|---------|---------|
| `ANALYTICS_ROLLUP_ENABLED` | `1` on STAGING | Gate rollup read + cron |
| `ANALYTICS_DAILY_CRON` | `0 2 * * *` | Override schedule |

---

## Worker flow

1. Cron fires `analytics.daily`
2. Handler runs `computeAllAdminAnalyticsRollups()` (4 periods × ~27 queries)
3. UPSERT into `admin_analytics_daily_rollups`
4. Metrics recorded in `analyticsMetrics` health snapshot

---

## Rollback

1. `ANALYTICS_ROLLUP_ENABLED=0` → API returns to live compute
2. `git revert` P15-3F commit
3. Rollup table remains (harmless); optional manual drop on STAGING only

---

## Verification

- `npm run p15-3f:validate`
- `npm run p15-3f:staging-smoke`
- `npm test`

---

## Next gate

**P15-3G** — Account deletion storage purge (do not open until P15-3F closed).

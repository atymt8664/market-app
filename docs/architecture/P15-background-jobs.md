# P15 — Background Jobs & Workers

| Field | Value |
|-------|-------|
| **Code** | P15 |
| **Status** | **Active** — P15-1 ✅ closed (architecture) · P15-2 ✅ closed (STAGING foundation) · **P15-3** next |
| **Authority** | This document + [SCALE-ROADMAP](../../infra/hetzner/phase6/SCALE-ROADMAP.md) |
| **Constitution** | Rule **A6** — *Sync by default, async by proof* |

**Related:** [P16-scale-architecture.md](./P16-scale-architecture.md) · [P11 push worker](../../artifacts/api-server/src/push-worker.ts) · [P08-admin monitoring](./P08-monitoring-boundary.md)

---

## الهدف / Goal

Move **durable, retryable, CPU- or IO-heavy side effects** off the API HTTP request path onto **VPS worker processes**, using **PostgreSQL (pg-boss) first** and **Redis (BullMQ) only when documented trigger metrics are met**.

Targets (10–50 year horizon): millions of users, ads, messages, notifications, and future orders — without rewriting the platform.

---

## Current state (code-verified, 2026-05-31)

| Component | Today | Gap |
|-----------|-------|-----|
| Email (Resend OTP / reset) | STAGING outbox via `auth.otp` / `auth.reset`; PRODUCTION sync | P15-3 remaining hot paths |
| In-app notifications | STAGING outbox via `notify.in_app`; PRODUCTION sync INSERT | P15-3C push unification |
| Web push | STAGING: pg-boss `push.deliver` → executePushDelivery; PRODUCTION: legacy schedulePushDelivery | Redis LIST decommission (future) |
| Ad image normalize (Sharp) | Sync CPU in upload path | Blocks API event loop |
| SLA auto-escalation | `runAutoEscalationAll()` on **admin read** | Should be scheduled cron |
| Admin analytics / NOC | ~27 parallel queries per request | No rollup cron |
| Account deletion storage purge | Sync unbounded loop | GDPR timeout risk |
| Search FTS | Postgres trigger (correct) | Bulk reindex = future maintenance job |
| pg-boss / BullMQ / general cron | pg-boss foundation on STAGING (`lib/jobs/`, `job-worker.ts`) | P15-3 hot-path migration |

**Approved stack unchanged:** Vercel · Hetzner VPS · Supabase Pro · WebSocket · Railway = legacy/fallback only.

---

## Target architecture

```
Frontend (Vercel)
      ↓ HTTPS
API (VPS — stateless; multi-replica later P16)
      ↓ transactional enqueue (fast ACK)
Queue Layer
      ↓
Workers (VPS — separate processes/containers)
      ↓
PostgreSQL / Storage / Resend / Web Push / Future services
```

### Layer responsibilities

| Layer | Role | Technology |
|-------|------|------------|
| Frontend | Presentation, RTL, WS client | Vercel |
| API | Auth, validation, fast ACK, WebSocket broadcast | Express on VPS |
| Queue | Durability, schedule, retry, priority | **pg-boss** (Phase 1) → **BullMQ** (Phase 2 if triggered) |
| Workers | Side effects, fan-out, CPU work | Node on VPS (Docker) |
| Database | Truth, outbox, job state | Supabase PostgreSQL |
| Storage | Media | Supabase Storage |
| Observability | Job health, alerts | P13 + P8 admin extension (P15-4) |

---

## Decision records (P15-1A — approved)

### ADR-001 — Queue Phase 1: PostgreSQL + pg-boss

| Field | Decision |
|-------|----------|
| **Choice** | **pg-boss** on existing Supabase PostgreSQL |
| **Rejected now** | BullMQ, RabbitMQ, SQS, managed cloud queues |
| **Why** | Zero new monthly services; transactional outbox with business writes; ACID; `SKIP LOCKED` safe for multi-worker; aligns with VPS + Supabase Pro principle |
| **When to revisit** | See [Trigger metrics for Phase 2](#trigger-metrics-for-phase-2-bullmq--redis) |

### ADR-002 — Queue Phase 2: BullMQ + Redis (conditional)

| Field | Decision |
|-------|----------|
| **Choice** | **BullMQ + Redis loopback** only after documented triggers |
| **Why not now** | Redis exists for P11 push spike only; adding BullMQ before load proof violates minimal-complexity rule |
| **Coexistence** | During migration: unify push from custom Redis LIST into shared queue (P15-3); decommission custom LIST |

### ADR-003 — Worker host: same VPS initially

| Field | Decision |
|-------|----------|
| **Choice** | Separate Docker services on Hetzner VPS (pattern: existing `push-worker.ts`) |
| **Scale path** | Replica count → dedicated worker VPS only when API CPU saturated |

### ADR-004 — Transactional outbox pattern

| Field | Decision |
|-------|----------|
| **Choice** | API commits business row + job enqueue in same DB transaction where possible |
| **Why** | No silent loss; no fire-and-forget IIFE for critical paths (email, notify) |

### ADR-005 — Environment isolation

| Field | Decision |
|-------|----------|
| **Rule** | Job payloads include env tag; pg-boss runs per Supabase ref — **never mix STAGING (`qkczposlooaldmsjfmun`) and PRODUCTION (`nptfxtkedqndkgmrcntn`)** |
| **Deploy** | Worker deploy tied to same release path as API (lesson from P8-1I prod-shadow drift) |

---

## Queue strategy

### Phase 1 — PostgreSQL + pg-boss (P15-2, P15-3)

- Job tables live in Supabase Postgres (STAGING first).
- Producers: `enqueueJob()` abstraction in API (future `lib/jobs/`).
- Consumers: worker processes poll via pg-boss.
- Supports: immediate, delayed (`startAfter`), cron (`schedule`), retry, completion states.

**Incremental cost:** €0 (existing Supabase Pro).

### Phase 2 — BullMQ + Redis (P16+ when triggered)

Adopt **only** when [trigger metrics](#trigger-metrics-for-phase-2-bullmq--redis) are met on STAGING load proof + Mohamed approval.

| Option | Verdict |
|--------|---------|
| pg-boss on Postgres | ✅ Phase 1 default |
| Redis LIST (today's push queue) | ⚠️ Migrate to unified queue in P15-3 |
| BullMQ + Redis | ✅ Phase 2 when triggered |
| RabbitMQ | ❌ Not in roadmap — unnecessary failure domain for this stack |
| Cloud managed queues | ❌ Breaks VPS-first principle unless explicitly approved |

### Trigger metrics for Phase 2 (BullMQ + Redis)

**All** must be sustained (≥24h) on STAGING load test before Phase 2 approval:

| # | Metric | Threshold |
|---|--------|-----------|
| T1 | Queue wait p95 | > 30 seconds |
| T2 | Postgres CPU from job polling | > 15% of DB CPU |
| T3 | Combined delivery volume | > 500K jobs/day |
| T4 | Multi-API replicas (P16) | ≥ 2 API instances need shared fast queue |

Document results in `docs/architecture/P15-background-jobs.md` § Phase 2 gate before any BullMQ wiring.

### When no external queue is needed

Operations below ~1K jobs/day with p99 enqueue < 100ms *may* stay synchronous — **except** email outbox and SLA cron, which move to pg-boss for **reliability** even at low volume.

---

## Worker strategy

### Worker types

| Worker | Job namespaces (examples) | Priority | Concurrency (initial) |
|--------|---------------------------|----------|------------------------|
| **Email** | `auth.otp`, `auth.reset`, future `billing.invoice` (P10) | critical (0) | 5–10 |
| **Notification** | `notify.in_app`, `notify.batch` | high (1) | 20–50 |
| **Push** | `push.deliver` (replaces custom Redis LIST) | high (1) | 10–30 |
| **Media** | `media.normalize_ad`, `media.thumbnail`, `media.purge` | normal (2) | 2–4 (CPU-bound) |
| **Operations** | `ops.sla_escalate`, `ops.expire_ads` | normal (2) | 1 (singleton cron) |
| **Rollup** | `analytics.daily`, `analytics.noc_snapshot` | low (3) | 1 |
| **Future** | `order.*` (P17), `trust.score` (P7), `search.reindex` (P14) | per P-domain | TBD when P opens |

### Priority levels

```
0 critical → auth email, security alerts
1 high     → push, in-app notify
2 normal   → media, moderation side-effects
3 low      → rollups, analytics, cleanup
```

### Scheduling

| Type | Mechanism |
|------|-----------|
| Immediate | Enqueue after API transaction commit |
| Delayed | pg-boss `startAfter` / BullMQ delay (Phase 2) |
| Cron | pg-boss `schedule` — e.g. SLA every 5–15m, rollups daily 02:00 UTC |
| Recurring singleton | One worker instance per cron job type (leader pattern via pg-boss) |

### Horizontal scaling

1. **Stage 1:** One container per worker type on VPS.
2. **Stage 2:** `docker compose scale` when queue depth > threshold (documented per worker).
3. **Stage 3:** Dedicated worker VPS — long-term only when Hetzner CPU saturated.

### Retry logic (standard policy)

| Attempt | Backoff | Notes |
|---------|---------|-------|
| 1 | immediate | |
| 2 | 30s | |
| 3 | 2m | |
| 4 | 10m | |
| 5 | 1h | **then DLQ** |

**Idempotency:** Every handler accepts `idempotencyKey` (e.g. `notify:{userId}:{type}:{entityId}`).

---

## Failure strategy

| Concern | Policy |
|---------|--------|
| **Retry** | pg-boss built-in + exponential backoff per job type |
| **Backoff** | Email: faster retries; media: slower (CPU) |
| **Dead Letter Queue** | pg-boss `failed` state + admin DLQ view (P15-4) |
| **Poison jobs** | Max 5 attempts → DLQ + alert; never infinite loop |
| **Partial failure** | Push: log per subscription; email: full job retry |
| **Recovery** | Admin DLQ replay runbook; handlers must be idempotent |
| **API during worker outage** | Durable enqueue succeeds → user gets fast ACK; side effect delayed — **never silent data loss** |

### API behavior matrix

| Path | Worker down behavior |
|------|---------------------|
| Auth signup | User row committed; email job pending/retry |
| Notification | In-app row committed; push job pending |
| Image upload | Raw stored; normalize job pending; UI shows processing state (P15-3) |

---

## Monitoring & observability strategy

Extends **P13** and **P8** monitoring boundary (`data-monitoring-tier="live"`).

| Metric | Source | Alert threshold (initial) |
|--------|--------|---------------------------|
| **Queue depth** | pg-boss / Redis LLEN during migration | > 1000 sustained 15m |
| **Failed jobs / hour** | DLQ count | > 50 |
| **Processing time p95** | Worker structured logs | > 30s (email), > 120s (media) |
| **Oldest pending job age** | Queue query | > 5m (critical), > 1h (low priority) |
| **Worker health** | Docker healthcheck + heartbeat row | down > 2m |

### Admin visibility (P15-4)

| Surface | Content |
|---------|---------|
| `/admin/monitoring` | Queue depth, worker status, failed count — **live tier** |
| `/admin/operations` | SLA cron last run (not on-read escalation) |
| Logs | `jobId`, `jobType`, `attempt` structured fields |
| P13 | Sentry breadcrumbs on terminal job failure |

**Known gap (pre-P15):** `push-queue-metrics.ts` — `incrementPushMetric` defined but not wired; address in P15-2.

---

## API vs Workers boundary

### Stays inside API (with rationale)

| Operation | Rationale |
|-----------|-----------|
| Session / auth / CSRF / TOTP | Security boundary (**P2/P8** protected zones) |
| WebSocket connect + message broadcast | Realtime contract (**P5**); enqueue **after** broadcast |
| Read queries (ads, search, chat) | User expects immediate data |
| Write validation + DB commit | Source of truth must be transactional |
| Admin RBAC + mutation audit | Low volume; audit must be immediate |
| Upload **accept** (store raw bytes) | User needs upload ACK; processing async |

### Moves to Workers (with rationale)

| Operation | Source (today) | Rationale |
|-----------|----------------|-----------|
| Resend email (OTP, reset) | `lib/email.ts` | External latency; retry; decouple auth UX |
| Notification INSERT at scale | `lib/create-notification.ts` | Fan-out; batch insert possible |
| Web push delivery | `schedule-push-delivery.ts` | Already partial — unify + DLQ |
| Ad image Sharp normalize | `lib/normalize-ad-image.ts` | CPU; blocks event loop |
| Storage bulk delete | `lib/account-deletion.ts` | Unbounded; GDPR timeout |
| SLA auto-escalation | `runAutoEscalationAll()` | **Anti-pattern on read** → cron |
| Analytics / NOC rollups | `handleAdminAnalytics`, snapshots | Expensive aggregation on poll |
| AI improve/suggest (optional) | `routes/ai.ts` | Long external calls |
| Future: orders, billing, trust scores | P17, P10, P7 | When those P-domains open |

### Job inventory by P-domain

| P | Future / current async candidates |
|---|-----------------------------------|
| **P2** | OTP email, password reset email |
| **P4** | Image normalize, thumbnail, expired-ad cleanup, view batching (at scale) |
| **P5** | Notification after message send (enqueue only) |
| **P6** | Account deletion storage purge |
| **P7** | Trust / seller score (future) |
| **P8** | SLA escalation cron, analytics rollups |
| **P10** | Billing emails, webhooks (future) |
| **P11** | Push delivery (migrate existing worker) |
| **P14** | Search bulk reindex (maintenance) |
| **P17** | Order auto-complete, shipping, payment (future) |

---

## P15 roadmap

### P15-1 — Architecture & decision records ✅ Closed

| Milestone | Scope | Status |
|-----------|-------|--------|
| **P15-1A** | Official docs + ADRs (this file, PROJECT_STATE) | ✅ Closed |

**Deliverables:** Queue/worker/failure/monitoring strategies; API vs worker boundary; Phase 1/2 gate; job inventory.

**Explicitly out of scope:** pg-boss install, migrations, worker code, Redis/BullMQ wiring, deploy.

---

### P15-2 — Queue foundation (STAGING only) ✅ Closed

| Item | Scope | Status |
|------|-------|--------|
| pg-boss schema on STAGING ref only | `pgboss` schema via pg-boss migrate | ✅ |
| Queue module | `src/lib/jobs/queue-module.ts` | ✅ |
| Worker bootstrap | `src/lib/jobs/worker-bootstrap.ts` + `src/job-worker.ts` | ✅ |
| Job registry | `system.ping`, `system.dlq_probe` foundation handlers | ✅ |
| Retry policy | Standard: 5× / 30s / exponential (max 3600s) | ✅ |
| DLQ foundation | `system.dead_letter` queue + probe path | ✅ |
| Observability | `collectQueueHealthSnapshot`, depth summary | ✅ |
| STAGING env guard | `JOB_QUEUE_ENABLED=1`; blocks PRODUCTION ref | ✅ |
| API unchanged | No HTTP route wiring; no sync-path migration | ✅ |

**Exit criteria met:** STAGING smoke PASS (`system.ping` completes, `system.dlq_probe` fails after retries, graceful shutdown); validate + unit tests PASS; no PRODUCTION touch; no Redis/BullMQ.

**Explicitly deferred to P15-3:** email outbox, notifications, OTP, push unification, image normalize, cron extractions.

---

### P15-3 — Hot path migration (STAGING → approved PROD) ⏳ Open

#### P15-3A — Email outbox ✅ (STAGING)

| Item | Status |
|------|--------|
| `auth.otp` / `auth.reset` job types | ✅ |
| Email worker handlers | ✅ |
| STAGING-only outbox gate (`EMAIL_OUTBOX_ENABLED`) | ✅ |
| Auth routes → enqueue on STAGING | ✅ |
| Critical priority + standard retry + DLQ | ✅ |
| Queue metrics + health snapshot | ✅ |
| PRODUCTION | ❌ sync path unchanged |

#### P15-3B — In-app notification outbox ✅ (STAGING)

| Item | Status |
|------|--------|
| `notify.in_app` job type | ✅ |
| Notification worker handler | ✅ |
| STAGING-only gate (`NOTIFICATION_OUTBOX_ENABLED`) | ✅ |
| `createNotification()` → enqueue on STAGING | ✅ |
| Preference gate at API (unchanged timing) | ✅ |
| High priority + standard retry + DLQ | ✅ |
| `schedulePushDelivery` preserved post-insert | ✅ (not push migration) |
| Queue metrics + health snapshot | ✅ |
| PRODUCTION | ❌ sync INSERT unchanged |

#### P15-3C — Push delivery outbox ✅ (STAGING)

| Item | Status |
|------|--------|
| `push.deliver` job type | ✅ |
| Push worker handler → `executePushDelivery` | ✅ |
| STAGING-only gate (`PUSH_OUTBOX_ENABLED`) | ✅ |
| `notification-persist` → enqueue push job | ✅ |
| High priority + standard retry + DLQ | ✅ |
| Legacy Redis LIST + `push-worker.ts` preserved | ✅ |
| PRODUCTION | ❌ `schedulePushDelivery` unchanged |

**Remaining in P15-3 (not started):**

| Order | Migration |
|-------|-----------|
| 4 | Image normalize worker |
| 5 | Extract `runAutoEscalationAll` → cron |
| 6 | Analytics daily rollup cron |
| 7 | Account deletion storage purge job |

**Full P15-3 exit criteria:** P8 admin smoke PASS; queue depth stable; prod-shadow worker deploy verified — **not met until all migrations complete.**

---

### P15-4 — Production hardening & observability

| Item | Scope |
|------|-------|
| Worker docker-compose on VPS (prod-shadow path) | P0 deploy |
| Admin monitoring: job health panel | P8 live tier |
| DLQ replay runbook | ops |
| Alert thresholds | P13 |
| Close P15 implementation wave | PROJECT_STATE |

---

## الملفات التابعة / Owned paths

| Current (sync) | Future owner |
|----------------|--------------|
| `artifacts/api-server/src/lib/email.ts` | Email worker |
| `artifacts/api-server/src/lib/create-notification.ts` | Notification worker (producer enqueue) |
| `artifacts/api-server/src/lib/push/*` | Push worker (unified queue) |
| `artifacts/api-server/src/push-worker.ts` | Evolve into unified worker runner |
| `artifacts/api-server/src/lib/normalize-ad-image.ts` | Media worker |
| `artifacts/api-server/src/lib/admin-operations-queue.ts` | Operations cron worker |
| `artifacts/api-server/src/lib/account-deletion.ts` | Media purge worker |
| (future) | `artifacts/worker/` or `lib/jobs/` |

---

## ما المسموح تعديله / Allowed changes

- P15-2+ worker package and pg-boss wiring on **STAGING** first
- Job schemas, retry policy, idempotency keys
- Documentation updates per sub-milestone

---

## ما الممنوع تعديله / Forbidden changes

- Breaking synchronous upload without worker fallback path
- BullMQ / Redis queue for all jobs before Phase 2 triggers documented
- PRODUCTION worker deploy without Mohamed approval
- Mixing STAGING and PRODUCTION job queues or env refs
- Secrets in job payloads

---

## Boundaries

- Workers **execute** tasks — no user-facing HTTP routes
- Workers do not implement business validation duplicated from API — consume validated payloads only

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | VPS process supervision, deploy scripts |
| **P1** | Env isolation STAGING/PRODUCTION |
| **P4**, **P5** | Job payloads (ads, messages) |
| **P8** | Admin job health visibility (P15-4) |
| **P13** | Metrics, alerting |
| **P14** | Index maintenance jobs |
| **P16** | Redis as Phase 2 queue backend; WS scale |

---

## Owner scope

- **Primary:** Platform backend / **Developer E** coordination

---

## Scalability notes

| Volume | Approach |
|--------|----------|
| 1M notifications/day | Fan-out via queue; batch insert |
| 1M messages/day | Enqueue notify after WS broadcast |
| 1M+ ads | FTS trigger (DB) + maintenance reindex jobs |
| Image uploads | Worker pool; limit API Sharp |
| Account deletion | Async GDPR purge job |

Growth path (with P16): pg-boss workers → Redis/BullMQ if triggered → API replicas → read replicas.

---

## Testing requirements

- Job idempotency unit tests
- STAGING: enqueue → process → verify side effect
- Failure injection (retry, DLQ, poison job)
- Load burst before Phase 2 gate evaluation
- No PRODUCTION job testing without approval

---

## Security notes

- Job payloads minimal — **no secrets** in queue messages
- Workers use service role with least privilege
- RLS unchanged — workers use same DB role model as API batch paths

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| PG job polling load | Medium | Indexes; Phase 2 gate |
| Worker deploy drift (prod-shadow) | High | Deploy workers in same release script as API |
| Dual queue during push migration | Medium | Time-boxed P15-3 migration |
| Email delay UX | Medium | Critical priority; status messaging |
| STAGING/PROD job mix | Critical | Env tag on every job; separate schemas |
| `runAutoEscalationAll` on read | Medium | P15-3 cron extraction (high ROI) |

---

## Rollback (implementation phases)

1. Revert worker container to previous image tag.
2. API falls back to sync path only if explicit fallback flag enabled (STAGING).
3. pg-boss schema rollback via migration down — STAGING only until proven.

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `infra/hetzner/phase6/SCALE-ROADMAP.md` | Step 2 — queue worker |
| `infra/hetzner/phase6/p11-*` | Push + Redis spike (precursor) |
| `artifacts/api-server/src/push-worker.ts` | First worker pattern |

---

## i18n namespace

Worker-internal strings: English logs only. User-facing results use owning P i18n.

---

*P15-1A — Architecture documentation & decision records. Re-verify after P15-2 implementation begins.*

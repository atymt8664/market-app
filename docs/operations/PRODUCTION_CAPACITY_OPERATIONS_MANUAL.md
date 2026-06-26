# Souq Arab EU — Production Capacity, Growth & Operations Manual v1.0

> **Document authority notice**
>
> This file is a **long-term operational reference** for capacity planning, scaling decisions, and daily monitoring.
> It is **analysis and guidance only** — it does **not** change or supersede:
>
> - [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md)
> - [PROJECT_STATE.md](../PROJECT_STATE.md)
> - [architecture/CONSTITUTION.md](../architecture/CONSTITUTION.md)
> - P-domain architecture docs under `docs/architecture/`
>
> **This document is NOT the SSOT** for project charter, architecture, or phase state.
> Refer to it when making **scaling, upgrade, and monitoring decisions**.
>
> **Type:** Documentation-only · No runtime, deploy, or code impact.

**Issue date:** 26 June 2026  
**Engineering authority (references):** PROJECT_CONSTITUTION · ADR-000 · P0/P5/P15/P16 · current code and infra  
**Production environment:** Supabase `nptfxtkedqndkgmrcntn` · VPS `178.105.206.173` · Frontend Vercel Git-only (ADR-006)

---

> **How to use this manual:** Return to it for every scaling decision. Numbers are classified as **High / Medium / Low Confidence**. Unless a source is explicitly cited from the project, the figure is an **engineering estimate** — not a Production load-test result.

---

# 1. Executive Summary

## Is the current architecture ready?

**Yes — ready for Google Play launch and gradual growth.**

### Why?

| Evidence | Source |
|----------|--------|
| Production-verified stack (Orders · Shipping · Notifications · Listing lifecycle) | PROJECT_STATE.md |
| Safe deploy path (Docker tagged · Git-only Vercel · rollback scripts) | P0 · ADR-006 |
| Live Admin monitoring (CPU · p95 · DB pool · WS count · queue) | P8-1H · admin-monitoring-snapshot.ts |
| Documented scale path without rewrite | P15 → P16 · SCALE-ROADMAP.md · ADR-000 |
| Frontend scales automatically via Vercel CDN | ADR-000 |

### Current limits (investor/partner summary)

| Dimension | Practical approximate limit | Confidence |
|-----------|----------------------------|------------|
| **Comfortable DAU** | 500 – 5,000 | Medium |
| **Concurrent WebSocket (distinct users)** | 300 – 1,500 | Medium |
| **Registered users (DB)** | 50K – 200K+ before DB pressure | High (ADR-000: 100K on single VPS) |
| **Ads (Postgres FTS)** | 100K – 500K | High (P14) |
| **Sustained API throughput** | ~50 – 200 req/s aggregate | Medium |

**Governing constraint:** VPS runs **one API process** (HTTP + WebSocket + sync side-effects) inside a container limited to **`768MB RAM / 2 CPU`**.

**Most important operational gap:** pg-boss is **proven on STAGING only** — Production still uses sync paths for email, notifications, and push (P15-background-jobs.md).

---

# 2. Current Infrastructure

## 2.1 Full diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                    │
│  PWA · TWA (Google Play) · Mobile Browser · Desktop         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (UI) · WSS (chat/notifications)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel — artifacts/souq                                    │
│  · Static SPA (React/Vite)                                  │
│  · Service Worker + manifest                                │
│  · Edge: og.js · sitemap-ads.js                              │
│  · Deploy: Git push main → Vercel (ADR-006)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ connect-src → api.souq-arab.com
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Hetzner VPS — souq-arab-api-prod-01 (178.105.206.173)      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Nginx :443                                         │    │
│  │  · TLS termination                                  │    │
│  │  · Rate limits · limit_conn                         │    │
│  │  · upstream → 127.0.0.1:3002                        │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Docker: api-prod-shadow (:3002 → :3001)            │    │
│  │  · Express REST API                                 │    │
│  │  · WebSocket /api/ws (in-process Map)               │    │
│  │  · Web Push VAPID scheduling                        │    │
│  │  · mem_limit: 768m · cpus: 2.0                      │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  (optional/partial) push-worker + Redis loopback — STAGING  │
│  Swap host: 2GB · node_exporter (optional)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ DATABASE_URL (pooler)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Pro — nptfxtkedqndkgmrcntn                        │
│  · PostgreSQL (data · sessions · FTS · orders · notify)     │
│  · Storage bucket: uploads (ads/ avatars/ chat/)            │
│  · RLS on application tables                                │
│  · pg-boss schema: STAGING ref only currently               │
└─────────────────────────────────────────────────────────────┘

Parallel (legacy/fallback — not primary):
  Railway API ← documented fallback only
  Docker :3001 ← STAGING ref container (loopback, not public)
```

## 2.2 Role of each layer

| Layer | Function | P-domain |
|-------|----------|----------|
| **Clients** | UI · RTL · WS client · SW push | P11 PWA/TWA |
| **Vercel** | CDN · build · CSP · OG previews · sitemap | P0 · P9 |
| **Nginx** | Edge proxy · TLS · rate limit · WS upgrade · body 55MB | P0 · P7 |
| **API (VPS)** | Auth · CRUD · chat · orders · admin · observability | P2–P8 · P17 |
| **WebSocket** | Chat realtime · typing · notification.created | P5 · P17-9 |
| **PostgreSQL** | Source of truth · sessions · FTS · transactional writes | P1 · lib/db |
| **Storage** | Ad images · avatars · chat attachments | P4 · P5 |
| **Push (VAPID)** | Web Push delivery path | P11 · P15 |
| **pg-boss** | Async queue (STAGING today) | P15 |
| **Redis (loopback)** | Push queue spike · WS pub/sub prep (STAGING) | P16 |

---

# 3. Current Capacity

## 3.1 Capacity table with confidence levels

| Metric | Approximate range | Confidence | Reason |
|--------|-------------------|------------|--------|
| **Registered Users** | **50,000 – 200,000+** | **High** | ADR-000: «100k users → Single VPS + Supabase Pro sufficient» · Postgres OLTP |
| **Daily Active Users (DAU)** | **500 – 5,000** comfortable | **Medium** | Single Node API + container 768MB · no prod baseline stored in repo |
| **Concurrent Users (HTTP active)** | **200 – 1,000** | **Medium** | nginx 40r/s/IP · aggregate depends on user behaviour |
| **Concurrent WS (distinct userIds)** | **300 – 1,500** | **Medium** | userSockets in-process · P16 target 10k requires Redis+replicas |
| **WS raw connections (tabs)** | **500 – 3,000** | **Low–Medium** | multi-tab per user · nginx 10 conn/IP for WS |
| **Ads (approved, FTS)** | **100,000 – 500,000** | **High** | P14: «Postgres FTS viable to high hundreds of thousands» |
| **Images (storage objects)** | **~1M – 5M objects** practical | **Medium** | 10 imgs/ad × 5MB max · Supabase Pro quota not in repo |
| **Messages / day** | **10,000 – 100,000** | **Medium** | DB handles more · WS broadcast in-process is the constraint |
| **Orders (active OLTP)** | **10,000 – 100,000+** | **High** | P17 schema verified prod · standard relational load |
| **Notifications / day** | **5,000 – 50,000** (sync) | **Medium** | PROD sync INSERT · P16: 1M/day → queue |
| **API req/s (sustained aggregate)** | **50 – 200 req/s** | **Medium** | container 2 CPU · Sharp sync on uploads reduces headroom |

## 3.2 Limits defined in code (High Confidence)

| Limit | Value | File / source |
|-------|-------|---------------|
| DB pool max (default prod) | **30** (cap **100**) | pool-config.ts |
| API container RAM | **768 MB** | docker-compose.yml |
| API container CPU | **2.0** | docker-compose.yml |
| Ad images upload | **10 × 5MB** + Sharp | P15-3D · storage.ts |
| Avatar/Chat image | **5MB** | users.ts · conversations.ts |
| New account ads/day (prod) | **5** | trust-limits.ts |
| Nginx general API rate | **40 req/s/IP** burst 80 | souq-phase3-limits.conf |
| Nginx WS conn/IP | **10** | souq-api-public.conf |
| Nginx API conn/IP | **40** | souq-api-public.conf |
| HTTP body max | **55MB** | souq-api-public.conf |
| WS proxy read timeout | **3600s** | souq-api-public.conf |
| Host swap (bootstrap) | **2 GB** | bootstrap-foundation.sh |

## 3.3 Unknown from repository (Low Confidence)

| Item | Note |
|------|------|
| **Exact Hetzner plan** (CPX21/31/41) | Not recorded in repo — bootstrap comment suggests ~8GB host |
| **Current Supabase Pro disk/compute usage** | Monitor via Supabase Dashboard only |
| **Actual Production throughput** | Scripts exist (baseline-api.mjs) but no prod artifacts stored |

---

# 4. What Will Break First?

## Bottleneck order (first to last)

```
1. API CPU (single Node process)
        ↓
2. API RAM (container 768MB + WS state + Sharp buffers)
        ↓
3. WebSocket in-process scaling ceiling
        ↓
4. Image Processing (Sharp sync — blocks event loop)
        ↓
5. Sync side-effects (email · push · notify — no pg-boss on PROD)
        ↓
6. Database Pool saturation (PG_POOL_MAX=30)
        ↓
7. PostgreSQL query latency (FTS · admin analytics)
        ↓
8. Supabase Storage quota / egress
        ↓
9. VPS Disk (logs · docker layers)
        ↓
10. Network bandwidth (Hetzner)
```

## Why this order?

| # | Component | Engineering reason |
|---|-----------|------------------|
| **1** | **API CPU** | One Node process serves REST + WS + admin + Sharp · cpus: 2.0 hard limit |
| **2** | **RAM** | mem_limit: 768m + userSockets Map + multer memoryStorage + Sharp |
| **3** | **WebSocket** | userSockets in-memory — **no horizontal scale** without P16 Redis adapter (realtime.ts, P05) |
| **4** | **Image Processing** | Sharp sync on upload path — «blocks event loop» (P15-3D) |
| **5** | **Sync side-effects** | PROD: sync email/notify/push — latency + failure risk at volume (P15) |
| **6** | **DB Pool** | 30 conn/process — alerts at 85%/95% (admin-monitoring-snapshot.ts) |
| **7** | **Database** | FTS + admin ~27 parallel queries (pre-rollup on PROD) — P14/P15 |
| **8** | **Storage** | grows linearly with ads × images — Supabase billing tier |
| **9** | **Disk** | VPS logs · docker json-file max 50m×5 per container |
| **10** | **Network** | Hetzner generous bandwidth — late bottleneck for EU marketplace |

**Will NOT break early:** Vercel frontend · Nginx edge (with rate limits) · Supabase Postgres at launch phase.

---

# 5. Capacity Thresholds

> **Source of numbers:** thresholds embedded in Admin Monitoring + NOC + P15/P16 docs.  
> **CPU:** NOC uses **load average 1m** vs **cores** — not fabricated CPU % (noc-cpu-metrics.ts).

## 5.1 CPU (Load Average 1m vs Cores)

| State | Condition | Source |
|-------|-----------|--------|
| **Normal** | loadAvg1m < cores × 0.6 | engineering — headroom |
| **Monitor** | loadAvg1m ≥ cores × 0.6 sustained 15+ min | engineering |
| **Upgrade needed** | loadAvg1m ≥ cores sustained 15+ min | **NOC warn** (noc-cpu-metrics.ts) |
| **Critical** | loadAvg1m ≥ cores × 1.5 sustained + p95 degraded | composite engineering |

## 5.2 RAM

| State | Condition | Source |
|-------|-----------|--------|
| **Normal** | systemUsedPercent < 60% | snapshotServerMetrics |
| **Monitor** | **60 – 80%** | engineering |
| **Upgrade needed** | **> 80%** sustained 15+ min | engineering · swap thrashing risk |
| **Critical** | **> 90%** or Docker OOM restart | Docker logs |

## 5.3 WebSocket (distinct users with open sockets)

| State | Condition | Source |
|-------|-----------|--------|
| **Normal** | < 500 | engineering · headroom under 768MB |
| **Monitor** | **500 – 1,000** | P16 prep zone |
| **Redis + scale plan needed** | **> 1,000 – 1,500** sustained | P16: 10k needs Redis adapter |
| **Critical** | **> 2,000** + RAM > 80% + chat delays | composite engineering |

**Metric:** monitoring.ws.online_users · countUsersWithOpenChatSockets() — /admin/monitoring

## 5.4 Response Time (HTTP p95)

| State | Condition | Source |
|-------|-----------|--------|
| **Normal** | **p95 < 2,000ms** | OBSERVABILITY.slowHttpMs default |
| **Monitor** | **2,000 – 4,000ms** | above target |
| **Warning** | **≥ 4,000ms** | slowHttpMs × 2 → admin alert |
| **Critical** | **≥ 8,000ms** | slowHttpMs × 4 → critical alert |

## 5.5 Queue (pg-boss — STAGING today · PROD after cutover)

| State | Queue Depth | DLQ | Source |
|-------|-------------|-----|--------|
| **Normal** | < 50 | 0 | engineering |
| **Monitor** | **≥ 100** sustained 15m | ≥ 5 | PG_BOSS_QUEUE_DEPTH_WARNING=100 |
| **Worker action needed** | **≥ 100 – 500** | ≥ 10 | PG_BOSS_DLQ_DEPTH_WARNING=10 |
| **Critical** | **≥ 1,000** | **≥ 50** | PG_BOSS_QUEUE_DEPTH_CRITICAL=1000 · DLQ critical=50 |

## 5.6 Push Queue (Redis LIST — PROD legacy path)

| State | Pending | Source |
|-------|---------|--------|
| **Normal** | < 50 | engineering |
| **Monitor** | **≥ 100** | admin-monitoring-snapshot.ts |
| **Critical** | **≥ 500** | same |

## 5.7 Database Pool

| State | Utilization | Source |
|-------|-------------|--------|
| **Normal** | **< 70%** | engineering |
| **Monitor** | **70 – 85%** | engineering |
| **Warning** | **≥ 85%** | admin-monitoring-snapshot.ts |
| **Critical** | **≥ 95%** | same · tune PG_POOL_MAX or reduce load |

## 5.8 DB Query Latency

| State | p95 DB | Source |
|-------|--------|--------|
| **Normal** | **< 500ms** | OBSERVABILITY.slowDbMs |
| **Monitor** | **500 – 1,000ms** | engineering |
| **Tuning / replica needed** | **> 1,000ms** sustained | P14 · P16 |
| **Critical** | readyz DB timeout fail | READYZ_DB_TIMEOUT_MS=3000 |

## 5.9 Search Latency

| State | p95 Search | Source |
|-------|------------|--------|
| **Normal** | **< 1,000ms** | OBSERVABILITY.slowSearchMs |
| **Monitor** | **1,000 – 2,000ms** | engineering |
| **Index tuning needed** | **> 2,000ms** sustained | P14 |
| **Critical** | search timeouts + 5xx | observability |

## 5.10 Storage (Supabase)

| State | Condition | Confidence |
|-------|-----------|------------|
| **Normal** | < 60% plan quota | Medium — monitor Supabase Dashboard |
| **Monitor** | 60 – 80% | Medium |
| **Upgrade/add-on** | > 80% | Medium |
| **Critical** | upload failures · 507 errors | High signal |

## 5.11 Disk (VPS root)

| State | Used % | Source |
|-------|--------|--------|
| **Normal** | < 70% | snapshotServerMetrics disk |
| **Monitor** | 70 – 85% | engineering |
| **Clean/expand** | > 85% | logrotate · docker prune |
| **Critical** | > 95% | write failures |

## 5.12 Error Rate (API 5xx)

| State | Rate | Source |
|-------|------|--------|
| **Normal** | < 1% | engineering |
| **Monitor** | 1 – 5% | engineering |
| **Warning** | **≥ 5%** | admin-monitoring-snapshot.ts |
| **Critical** | **≥ 10%** | same |

## 5.13 Network

| State | Condition | Confidence |
|-------|-----------|------------|
| **Normal** | no nginx error spike | nginx-api-error.log |
| **Monitor** | elevated 429 (rate limit) | nginx access log |
| **Action needed** | sustained 502/504 upstream | nginx → API unhealthy |
| **Critical** | VPS unreachable | external health check |

---

# 6. Upgrade Decision Matrix

> **Golden rule:** Do not skip stages. Official order: **P15 prod cutover → Redis → VPS upgrade → API replica → Read replica → Dedicated search** (SCALE-ROADMAP.md).

| If this happens... | Decision | Confidence |
|--------------------|----------|------------|
| All metrics green · load < 60% cores · p95 < 2s · WS < 500 | **Do nothing** | High |
| loadAvg1m 60–80% cores · p95 2–4s · no sustained trend | **Monitor only** — daily checklist | High |
| loadAvg1m ≥ cores × 15+ min · RAM > 80% · no queue issue | **Upgrade RAM/CPU (Hetzner plan)** | High |
| loadAvg1m ≥ cores · upload spikes correlate · p95 > 4s during uploads | **VPS upgrade first** — not API replica yet | High |
| Push pending ≥ 100 · email delays · notify lag | **Enable pg-boss on PRODUCTION** (P15 prod cutover) | High |
| pg-boss depth ≥ 100 sustained · worker down | **Start/fix job-worker container** | High |
| pg-boss depth ≥ 1000 · DLQ ≥ 50 | **Scale worker + DLQ replay** (P15-4 runbook) | High |
| WS users > 1,000 · chat delays · before any replica | **Redis loopback + WS adapter (P16 STAGING proof → PROD)** | High |
| Push path dual (Redis LIST + pg-boss) during migration | **Complete P15-3C prod unification** — time-boxed | High |
| CPU maxed · pool < 85% · Redis WS adapter live | **Add API replica #2** (nginx upstream) | High |
| CPU maxed · pool ≥ 85% · replicas planned | **Raise PG_POOL_MAX cautiously** (max 100) + replica | High |
| 2+ API replicas · queue wait p95 > 30s · DB job CPU > 15% · > 500K jobs/day | **Evaluate BullMQ Phase 2** (P15 gate — Mohamed approval) | High |
| Search p95 > 1s · ads > 200K · browse CPU on DB | **Supabase read replica** | High |
| Ads > 500K–1M · FTS degradation | **Dedicated search (P14)** — ADR required | High |
| Admin analytics slow · NOC queries heavy | **P15-3F analytics rollup prod cutover** | High |
| Storage > 80% quota | **Supabase storage add-on** — not VPS | Medium |
| Disk > 85% VPS | **logrotate · docker prune · do not upgrade infra** | High |

## Never do (causes outage)

| ❌ Do not | Why |
|----------|-----|
| API replica #2 **without** Redis WS adapter | WS messages lost across instances |
| BullMQ **before** P15 Phase 2 gate metrics | violates ADR-001/002 |
| Firebase/FCM/Pusher | ADR-000 prohibited |
| scp source to VPS | tagged Docker only (P0) |
| Mix STAGING/PROD Supabase refs | S1 constitution — critical |
| Preemptive upgrade «just in case» | Cost Optimization §8 |

---

# 7. Growth Timeline

> **Registered users** ≠ **DAU** ≠ **Concurrent WS**. Table uses **registered users** as planning axis with DAU estimate ~**5–15%** (Medium Confidence — marketplace norm, not in repo).

| Stage | Registered (approx) | DAU (5–15%) | What to monitor | What to change | Do not touch | VPS | API #2 | DB Upgrade |
|-------|---------------------|-------------|-----------------|----------------|--------------|-----|--------|------------|
| **Launch** | 0 – 1K | < 150 | NOC · p95 · WS · 5xx | Nothing | Redis · replicas | ❌ | ❌ | ❌ |
| **1K** | 1K – 5K | 50 – 750 | + push pending · pool % | Complete P17-9-13 push verify | pg-boss preemptive | ❌ | ❌ | ❌ |
| **5K** | 5K – 10K | 250 – 1.5K | WS count · upload CPU spikes | Plan P15 prod cutover | VPS upgrade | ❌ | ❌ | ❌ |
| **10K** | 10K – 25K | 500 – 3.75K | queue depth · sync path latency | **P15 prod cutover** if triggers | BullMQ · search | ⚠️ monitor | ❌ | ❌ |
| **25K** | 25K – 50K | 1.25K – 7.5K | load vs cores · RAM 80% | VPS RAM/CPU upgrade if triggered | API replica without Redis | ⚠️ maybe | ❌ | ❌ |
| **50K** | 50K – 100K | 2.5K – 15K | WS > 1K · search p95 | **Redis + WS adapter** | dedicated search | ✅ likely | ❌ | ⚠️ monitor |
| **100K** | 100K – 250K | 5K – 37K | pool 85% · FTS latency | **API replica #2** post-Redis | BullMQ without gate | ✅ | ✅ | ⚠️ maybe |
| **250K** | 250K – 500K | 12K – 75K | DB CPU · storage 60% | **Read replica** · analytics rollup prod | rewrite · SaaS push | ✅ | ✅ | ✅ |
| **500K** | 500K – 1M | 25K – 150K | search · queue T3 metrics | worker scale · pool tuning | media async (needs contract) | ✅+ | ✅ 2–3 | ✅ |
| **1M** | 1M+ | 50K+ | all P16 targets | ADR-gated steps per ADR-000 | premature partition | ✅ dedicated workers maybe | ✅ 3+ | ✅+ |

---

# 8. Cost Optimization

## 8.1 Do not upgrade early

| Item | Why |
|------|-----|
| **Larger VPS plan** | Until load ≥ cores sustained |
| **API replica #2/#3** | Until Redis WS adapter live + CPU maxed |
| **BullMQ + Redis queue** | Until P15 Phase 2 gate (4 metrics) met |
| **Dedicated search engine** | Until ads > ~500K or FTS p95 > 1s sustained |
| **Supabase compute add-on** | Until pool/DB latency triggers |
| **Separate worker VPS** | Until API CPU saturated on same host |
| **Managed Redis outside VPS** | ADR-000 prohibited |

## 8.2 Do not touch until necessary

| Item | Trigger |
|------|---------|
| **Railway decommission** | VPS stable months + rollback tested |
| **media.normalize_ad async** | millions uploads/day + two-phase upload ADR |
| **Multi-region** | ADR + traffic proof |
| **Partition/sharding** | ADR-000: 10M users path |

## 8.3 Common premature scaling mistakes

| Mistake | Result | Correct alternative |
|---------|--------|---------------------|
| API replicas without Redis WS | chat/notifications broken | P16 Redis first |
| Managed SaaS push/realtime | vendor lock + cost | VAPID + pg-boss |
| Oversized VPS «just in case» | wasted €/month | trigger-based upgrade |
| pg-boss + BullMQ together prematurely | dual complexity | pg-boss until gate |
| CDN for API static | unnecessary at current scale | Vercel handles frontend |
| Rewrite monorepo for scale | years lost | P15/P16 incremental path |

## 8.4 Highest money-saving decision (10–50 years)

**«Sync by default, async by proof» (Constitution A6) + pg-boss on existing Supabase = €0 queue infra.**

Do not pay per-message SaaS. Execute P15 prod cutover **at trigger** — not before.

---

# 9. Failure Prevention

## 9.1 When to act?

| Pattern | Timing | Principle |
|---------|--------|-----------|
| **Trend-based** (best) | **2 – 4 weeks before** projected trigger | load trending ↑ · WS ↑ 20%/week |
| **Threshold-based** | **Immediately at warning** | NOC warn · pool 85% |
| **Calendar-based** | ❌ do not use | no «upgrade every 6 months» |

**Do not wait for:** critical alerts · 5xx ≥ 5% · user complaints · App Store reviews mentioning «slow».

## 9.2 Danger signs (before collapse)

### 🟡 First sign — «system under pressure but stable»

- loadAvg1m 60–80% of cores **3+ consecutive days**
- HTTP p95 **1,500 – 3,000ms** (below 4K warn but rising)
- WS online users **400 – 800** and climbing
- Push pending **30 – 80**

**Action:** daily monitoring → weekly trend log → **plan** P15 cutover or VPS upgrade within 30 days.

### 🟠 Second sign — «start this week»

- loadAvg1m ≥ cores (NOC **warn**)
- HTTP p95 **≥ 4,000ms** (admin warning alert)
- DB pool **≥ 85%**
- Push pending **≥ 100**
- pg-boss depth **≥ 100** (post cutover)

**Action:** execute planned upgrade **within 7 days** · no new features that add CPU load.

### 🔴 Third sign — «outage risk imminent»

- HTTP p95 **≥ 8,000ms** OR 5xx **≥ 10%**
- DB pool **≥ 95%**
- Docker **OOM restart** or API healthz failing
- Queue depth **≥ 1,000** OR push pending **≥ 500**
- WS users **> 1,500** without Redis adapter

**Action:** **immediate** — VPS upgrade + worker restart + consider emergency rate limit tuning (nginx — Mohamed approval).

## 9.3 Preventing user-visible slowness

| Layer | Prevention |
|-------|------------|
| **Frontend** | Vercel CDN — rarely user-visible slowness |
| **API reads** | p95 monitoring · home stability guards (P9-A/B) |
| **Chat** | WS reconnect client-side · act on WS count before 1.5K |
| **Uploads** | Sharp sync — limit concurrent uploads via nginx 30r/m upload zone |
| **Push** | pg-boss cutover before pending ≥ 100 sustained |
| **Admin** | SLA cron off read-path (P15-3E prod) before admin slowness affects ops |

**Act on metrics — not on user reports alone.**

---

# 10. Monitoring Checklist

## 10.1 Every morning — /admin/monitoring + NOC

**Order (5 – 10 minutes):**

| # | Check | ✅ Normal | ⚠️ Act Today | 🔴 Emergency |
|---|-------|-----------|--------------|--------------|
| 1 | **Overall status** | ok | warning | critical |
| 2 | **NOC CPU load 1m vs cores** | < 0.6× cores | 0.6–1.0× | ≥ cores |
| 3 | **RAM systemUsedPercent** | < 60% | 60–80% | > 80% |
| 4 | **HTTP p95 latency** | < 2,000ms | 2K–4K | ≥ 4K / 8K |
| 5 | **5xx error rate** | < 1% | 1–5% | ≥ 5% |
| 6 | **DB pool utilization** | < 70% | 70–85% | ≥ 85% |
| 7 | **WS online users** | < 500 | 500–1K | > 1K |
| 8 | **Push pending** | < 50 | 50–100 | ≥ 100 |
| 9 | **pg-boss queue depth** (post cutover) | < 50 | ≥ 100 | ≥ 1,000 |
| 10 | **Storage health** | ok | latency up | critical |
| 11 | **Disk used (VPS)** | < 70% | 70–85% | > 85% |
| 12 | **SLA exceeded count** | 0 | 1–9 | ≥ 10 |

## 10.2 Daily verdict

| State | Say |
|-------|-----|
| All #1–8 green · no trend ↑ 7 days | **«Today everything is normal»** |
| #2 or #4 or #7 yellow 2+ days | **«Plan upgrade within 2–4 weeks»** |
| Any 🔴 | **«Start upgrade now — contact Platform lead»** |

## 10.3 Weekly (15 minutes)

- Compare WS count · p95 · load trend vs last week
- Supabase Dashboard: storage % · DB connections · slow queries
- Review nginx error log bytes (phase5-collect-baseline.sh pattern)
- Optional: phase6-vps-monitor-snapshot.sh cron output

## 10.4 Monthly

- Document milestone vs Growth Timeline §7
- Review Growth Timeline stage — update internal ops log
- P9 PSI/LCP if home perf regressing (P9-B baseline)

---

# 11. Worst Case Scenario

**Scenario:** viral spread → **thousands of registered users in days** · DAU spike 10× · WS flood.

## 11.1 Actions — in order (first 24–72 hours)

| # | Action | Timeframe | Avoid |
|---|--------|-----------|-------|
| **1** | Open /admin/monitoring — identify **which threshold hit first** | Hour 0 | Panic deploy untested code |
| **2** | Verify API healthz/readyz public (verify-production-public-api.sh pattern) | Hour 0 | DNS/SSL changes |
| **3** | If load ≥ cores: **Hetzner VPS resize** (RAM/CPU up) | Hour 1–4 | Adding API replica without Redis |
| **4** | If push pending ≥ 100: restart push-worker · expedite **P15 prod cutover** if pre-staged | Hour 1–8 | Disabling push entirely |
| **5** | If WS > 1K + chat lag: **communicate** · prioritize P16 Redis spike to PROD (STAGING proof exists) | Day 1–3 | Killing WS connections globally |
| **6** | If pool ≥ 85%: tune PG_POOL_MAX (max 100) **only if** Supabase connections allow | Hour 2–6 | PG_POOL_MAX > 100 |
| **7** | If 5xx ≥ 5%: rollback API to PREVIOUS_TAG (rollback-api.sh) | Immediate if deploy-related | force push |
| **8** | Enable stricter nginx burst only with **Mohamed approval** | Last resort | blocking legit users broadly |
| **9** | Post-incident: baseline snapshot (phase5-collect-baseline.sh on VPS) | After stable | skipping root cause doc |

## 11.2 What to avoid (causes outage)

- Deploy architecture change + traffic spike simultaneously
- STAGING/PROD env mix
- Multiple changes in one deploy (API + worker + Redis + replica)
- Turning off monitoring to reduce alert noise
- Premature BullMQ migration under pressure

---

# 12. Long-Term Architecture

## 12.1 Today (Launch)

```
Client → Vercel → Nginx → API (:3002) → Supabase (DB + Storage)
                              ↕ WS in-process
                         Sync side-effects
```

## 12.2 Stage 1 — Queue Maturity (P15 PROD)

```
Client → Vercel → Nginx → API → pg-boss (Supabase)
                              ↓
                         job-worker(s) on VPS
                              ↓
                    Email · Notify · Push · Cron
```

## 12.3 Stage 2 — Redis + WS Scale (P16)

```
Client → Vercel → Nginx → API ←→ Redis (127.0.0.1)
                              ↕ pub/sub
                         (multi-instance ready)
```

## 12.4 Stage 3 — Horizontal API

```
Client → Vercel → Nginx (upstream round-robin)
                    ↓
              ┌─────┼─────┐
           API-1  API-2  API-3
              └─────┼─────┘
                    ↓
              Redis pub/sub
                    ↓
           Supabase pooler → Primary
```

## 12.5 Stage 4 — Read + Search Scale

```
                    ┌→ Read Replica (browse/search)
API workers ──→ Primary (writes)
                    └→ Dedicated Search (optional, P14)
                              ↓
                         Supabase Storage
```

**Each stage:** reversible · tagged Docker · ADR when required · **zero monorepo rewrite**.

---

# 13. Final Recommendations

## Direct answers

| Question | Answer |
|----------|--------|
| **Is architecture suitable for Google Play?** | **Yes.** Production-verified · monitoring live · rollback ready. |
| **Need VPS upgrade now?** | **No** — unless triggers §5 appear (load ≥ cores · RAM > 80%). |
| **When first recommended upgrade?** | At **first sustained** NOC CPU warn (loadAvg1m ≥ cores) **or** push pending ≥ 100 — whichever comes first. |
| **First future upgrade?** | **P15 pg-boss Production cutover** (€0) — before VPS $$$. |
| **Last upgrade to avoid until necessary?** | **Dedicated search engine + BullMQ + multi-region + managed Redis SaaS.** |
| **Scalable to millions without rewrite?** | **Yes — gradually.** ADR-000: 100K → 1M → 10M each via documented steps. |
| **Highest money-saving decision?** | **Trigger-based scaling + pg-boss on existing Supabase** — no per-message SaaS. |
| **What would CTO do in year one?** | See §13.1 |

## 13.1 CTO plan — first year after launch

| Quarter | Focus | Deliverable |
|---------|-------|-------------|
| **Q1 (Launch)** | Monitoring discipline · P17-9-13 push close · P9-11 Scale Readiness when approved | Daily checklist habit · zero surprise outages |
| **Q2** | P15 PROD cutover when triggers · baseline load script on prod (store artifacts) | Async side-effects live |
| **Q3** | P16 Redis + WS adapter STAGING→PROD if WS > 800 sustained | Horizontal-ready realtime |
| **Q4** | Review vs 100K milestone · read replica decision · cost audit | Updated ops manual v1.1 |

**CTO must NOT do in year one:**

- Rewrite · new vendors · preemptive multi-region · BullMQ without gate · API replicas without Redis

---

## 13.2 Official Scale Path (SSOT reference — architecture docs)

```
Today:     Single VPS API + Supabase Pro + Vercel
Stage 1:   pg-boss workers (PROD)           — P15
Stage 2:   Redis loopback + WS adapter      — P16
Stage 3:   VPS upgrade (RAM/CPU)            — P0
Stage 4:   API replica #2/#3 + nginx        — P16
Stage 5:   Read replica + search tuning     — P14/P16
Long-term: Dedicated workers · search · ADR-gated partition — ADR-000
```

> **Note:** The authoritative scale path remains in `infra/hetzner/phase6/SCALE-ROADMAP.md`, P15-background-jobs.md, and P16-scale-architecture.md. This manual operationalizes those documents.

---

## Document Control

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Type** | Operations Manual — documentation reference |
| **Next review** | At 10K registered users · or any critical incident · or P15 PROD cutover |
| **Authority chain** | PROJECT_CONSTITUTION → ADR-000 → P15/P16 → this manual |
| **Does NOT supersede** | PROJECT_CONSTITUTION · PROJECT_STATE · architecture/CONSTITUTION |

---

*End of Souq Arab EU — Production Capacity, Growth & Operations Manual v1.0*

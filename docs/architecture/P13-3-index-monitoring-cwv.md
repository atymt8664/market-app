# P13-3 — Index Monitoring + Core Web Vitals

| Field | Value |
|-------|-------|
| **Code** | P13-3 |
| **Parent** | **P13** Analytics & Observability |
| **Status** | **P13-3-A ✅ Index Monitoring** · **P13-3-B ✅ Core Web Vitals** — pending deploy verification for full P13-3 close |
| **Horizon** | 10–50 year marketplace — index health + CWV at millions of URLs/sessions |

**Charter:** [CONSTITUTION.md](./CONSTITUTION.md) · **P13:** [P13-analytics-observability.md](./P13-analytics-observability.md) · **Index:** [README.md](./README.md)

---

## Goal

Close the gap between **Search Console readiness (P13-1)** and **ongoing production visibility**:

1. **Index Monitoring** — repeatable, automatable checks that public URLs remain crawlable, indexable, and structurally correct for Google (and future Bing in **P13-4**).
2. **Core Web Vitals (CWV)** — documented SLOs, measurement pipeline, and verification gates for LCP / INP / CLS on primary user routes — coordinated with **P9** delivery optimizations, owned observability surface in **P13**.

**P13-3-0 deliverable:** this charter + SLO tables + acceptance criteria + milestone map. **No runtime code** in P13-3-0.

---

## Prerequisites (closed — do not regress)

| Milestone | Scope | Verification |
|-----------|--------|--------------|
| **P13-1** | GSC readiness: robots, sitemaps, Googlebot ad prerender, JSON-LD crawl path | `gsc:p13:validate`, `gsc:p13:prod` |
| **P13-2** | Global visual baseline `#0A0A0A` | Visual scripts + production deploy |
| **P11-4 / P11-5** | SEO + social meta foundation | `seo:p11:validate`, `social:p11:validate` |
| **P3-5 / P4-1** | Homepage + ad structured data | `structured:p3:validate`, `structured:p4:validate` |
| **P9** | Performance delivery (images, lazy routes, gate i18n) | Lighthouse artifacts, `p9-prod-verify.mjs` |

---

## Scope

### In scope (P13-3)

| Area | P13-3 sub-milestone | Notes |
|------|---------------------|-------|
| Index monitoring scripts (local + production read-only) | **P13-3-A** | Extends P13-1; no GSC API secrets in git |
| GSC operational runbook (manual steps for property owner) | **P13-3-A** | DNS/HTML verify, sitemap submit, URL inspection checklist |
| CWV SLO definitions + route matrix | **P13-3-0** ✅ | This document |
| RUM / vitals collection (privacy-safe, low cardinality) | **P13-3-B** ✅ | `POST /api/observability/vitals` + `web-vitals-reporting.ts` |
| CWV verification scripts (Lighthouse mobile gates) | **P13-3-B** ✅ | `cwv:p13:validate`, `cwv:p13:prod`, `.lighthouse-p13-3-*.json` |
| CI hooks for local index + CWV readiness checks | **P13-3-A / B** | PR gate only for local scripts; prod smoke requires approval |
| Cross-link **P9** ↔ **P13** for perf fixes triggered by CWV FAIL | **P13-3-B** | P9 implements; P13 measures and gates |

### Out of scope (other P)

| Item | Owner |
|------|-------|
| Bing Webmaster Tools | **P13-4** (next after P13-3) |
| Admin NOC CPU / VPS host metrics panels | **P13** (future) + **P8** display |
| Product analytics funnels | **P13** future / EU privacy review |
| Payment, orders, admin RBAC | **P10 / P17 / P8** |
| Search ranking / FTS weights | **P14** |
| New third-party analytics SDK without privacy review | **Forbidden** (CONSTITUTION P13) |
| DNS / SSL / Vercel deploy / VPS deploy | **P0** — Mohamed approval |
| Visual identity `#0A0A0A` changes | **P13-2** — frozen |

---

## Milestone map

```
P13-3-0  Charter + SLOs (docs)                    ← current
    ↓
P13-3-A  Index Monitoring (scripts + runbook)
    ↓
P13-3-B  Core Web Vitals (RUM + Lighthouse gates)
    ↓
P13-3    CLOSED ✅ (all acceptance criteria below)
    ↓
P13-4    (blocked until P13-3 closed)
```

| ID | Name | Deliverable | Code allowed? |
|----|------|-------------|---------------|
| **P13-3-0** | Charter + SLOs | This file + P13 doc cross-links | Docs only |
| **P13-3-A** | Index Monitoring | `validate-p13-3-index-*.mjs`, npm scripts, GSC runbook | Scripts + docs |
| **P13-3-B** | Core Web Vitals | RUM endpoint + client + `validate-p13-3-cwv*.mjs` | Frontend + API lib |

---

## Core Web Vitals — official SLOs

Thresholds align with [Google CWV](https://web.dev/articles/vitals) **“Good”** at **75th percentile** (field data target). Lab gates (Lighthouse mobile) use the same numeric thresholds for PASS/FAIL scripts.

### Primary routes (mandatory)

| Route | Purpose | LCP (Good) | INP (Good) | CLS (Good) |
|-------|---------|------------|------------|------------|
| `/` | Home / discovery | ≤ **2500 ms** | ≤ **200 ms** | ≤ **0.1** |
| `/ad/:id` | Public ad detail (sample approved ad) | ≤ **2500 ms** | ≤ **200 ms** | ≤ **0.1** |
| `/categories` | Category browse entry | ≤ **2500 ms** | ≤ **200 ms** | ≤ **0.1** |
| `/search` | Search shell | ≤ **2500 ms** | ≤ **200 ms** | ≤ **0.1** |

### Secondary routes (monitor; gate optional in P13-3-B v1)

| Route | Notes |
|-------|-------|
| `/category/:id` | Gate when stable public category id available in prod verification |
| `/users/:id` | Public profile — index + perf sample |

### Measurement modes

| Mode | Tool | Use |
|------|------|-----|
| **Lab** | Playwright mobile + CDP throttling (Lighthouse-equivalent SLO gates) | CI + pre-deploy gate; artifacts `.lighthouse-p13-3-*.json` |
| **Field (RUM)** | First-party vitals beacon → **P13** API | Production ongoing; p75 aggregation; no PII |

**Baseline reference (pre–P13-3-B, lab):** `.lighthouse-7a6-prod.json` — Home performance **0.89**, LCP **~3.1 s**, CLS **0**. P13-3-B must track improvement toward SLO without regressing CLS.

### Measurement architecture (P13-3-B — decision locked in charter)

| Option | Verdict |
|--------|---------|
| **First-party** `POST /api/observability/vitals` + `web-vitals` on client | **Preferred** — fits VPS + Supabase stack; low-cardinality labels (`route`, `metric`, `rating`); no new vendor |
| Vercel Speed Insights | Allowed only if privacy-reviewed and approved; stack already on Vercel |
| Full third-party RUM (GA4, etc.) | **Not in P13-3** — requires separate EU privacy milestone |

**Vitals payload rules (P13-3-B):**

- No user id, email, IP storage in vitals table/logs
- Labels: `route` (normalized path pattern), `metric` (`LCP` \| `INP` \| `CLS`), `value`, `rating` (`good` \| `needs-improvement` \| `poor`)
- Sample rate configurable via env (default 100% in STAGING, ≤10% PRODUCTION until scale proof)

---

## Index Monitoring — acceptance targets (P13-3-A)

Automated checks extend **P13-1** with:

| Check | PASS condition |
|-------|----------------|
| `robots.txt` | Allows `/`; blocks `/admin`; lists both sitemap URLs |
| `/sitemap.xml` | 200, valid urlset, core static URLs |
| `/sitemap-ads.xml` | 200, XML, contains `/ad/{id}`, not SPA HTML |
| Googlebot `/ad/{id}` | 200, `Product` JSON-LD in first HTML |
| Homepage | P3-5 JSON-LD present |
| Noindex leak scan | Public routes in matrix use `index,follow` unless explicitly documented (e.g. auth pages `noindex`) |
| Canonical origin | `https://www.souq-arab.com` only |

**Manual (property owner — not in git):**

- GSC Domain or URL-prefix property verified (DNS TXT preferred)
- Both sitemaps submitted in GSC
- URL Inspection spot-check: `/` and sample `/ad/{id}` → “URL is on Google” or eligible

---

## Owned paths (future implementation)

| Layer | Paths (P13-3-A / B) |
|-------|---------------------|
| Docs | `docs/architecture/P13-3-index-monitoring-cwv.md`, `docs/architecture/P13-analytics-observability.md` |
| Frontend scripts | `artifacts/souq/scripts/validate-p13-3-index-*.mjs`, `validate-p13-3-cwv*.mjs` |
| Frontend lib | `artifacts/souq/src/lib/web-vitals-reporting.ts` (P13-3-B) |
| API | `artifacts/api-server/src/routes/observability.ts`, `lib/observability/vitals*.ts` (P13-3-B) |
| Artifacts | `artifacts/souq/.lighthouse-p13-3-*.json` |
| CI | `.github/workflows/ci.yml` — local validate steps only |

---

## Testing requirements

### P13-3-0 (this milestone)

| Test | Expected |
|------|----------|
| Doc review | Charter + SLO tables present |
| No application code change | `typecheck`, `build`, existing validate scripts unchanged PASS |

### P13-3-A

| Script | Environment |
|--------|-------------|
| `index:p13:validate` | Local / CI |
| `index:p13:prod` | Production read-only (approved) |
| `gsc:p13:validate` + `gsc:p13:prod` | Regression PASS |
| Runbook | [P13-3-A-gsc-runbook.md](./P13-3-A-gsc-runbook.md) |

### P13-3-B

| Script | Environment |
|--------|-------------|
| `cwv:p13:readiness` | Local / CI — static wiring + vitals unit test |
| `cwv:p13:validate` | Local preview + Lighthouse mobile lab |
| `cwv:p13:prod` | Production lab smoke (approved) |
| RUM endpoint | `POST /api/observability/vitals` — sample rate env; export via admin `GET /api/observability/metrics` → `webVitals` |

**Ops export:** Admin session → `GET /api/observability/metrics` → `webVitals.byRouteMetric` (p75Ms per route/metric). No PII.

---

## P13-3 closure criteria (full phase)

**P13-3 is CLOSED ✅ only when all are true:**

1. **P13-3-0** — this charter merged; P13 parent doc updated.
2. **P13-3-A** — index scripts PASS local + production; GSC runbook documented; CI runs local index validate.
3. **P13-3-B** — RUM pipeline live on PRODUCTION (approved); CWV scripts PASS on primary route matrix; SLO dashboard or export documented for ops.
4. **Regression** — P13-1, P13-2, P11, P3-5, P4-1, P9 validate scripts PASS.
5. **Deploy** — Vercel (+ VPS if API touched) verified; single final report PASS.
6. **PROJECT_STATE** — P13-3 marked closed; P13-4 unblocked.

---

## Security & environments

| Rule | Detail |
|------|--------|
| **S1** | Never mix STAGING (`qkczposlooaldmsjfmun`) and PRODUCTION (`nptfxtkedqndkgmrcntn`) in scripts, env, or verification targets |
| **S2** | No GSC/Bing API keys, verification tokens, or DNS secrets in git |
| **S3** | No PII in vitals or index monitor logs |
| **S4** | Production smoke scripts — run only with explicit approval (Mohamed) |

---

## Rollback plan

| Layer | Action |
|-------|--------|
| **P13-3-0 (docs only)** | Revert doc commits; no runtime impact |
| **P13-3-A scripts** | Remove scripts + CI steps; P13-1 scripts remain authoritative |
| **P13-3-B RUM** | Disable env flag for vitals ingestion; revert client import; API route returns 404 |
| **Deploy** | Vercel rollback to pre-P13-3 deployment; VPS `rollback-api.sh` if API changed |

---

## Dependencies

| P | Relationship |
|---|--------------|
| **P9** | Implements perf fixes when CWV gates fail; P13 owns measurement |
| **P11 / P3 / P4** | SEO + structured data foundation for index checks |
| **P0** | Deploy, CSP connect-src for vitals endpoint |
| **P8** | Future display of CWV/index summaries in admin (not P13-3) |
| **P13-4** | Blocked until P13-3 closed |

---

## i18n namespace

N/A for P13-3 instrumentation. Admin labels (future) → `p8.admin.metrics.*` with **P8** sign-off.

---

*P13-3-0 — Charter + SLOs. Docs only; no application code.*

# P13 — Analytics & Observability

| Field | Value |
|-------|-------|
| **Code** | P13 |
| **Status** | Active — P13-1/2 closed; **P13-3 in progress** (Index Monitoring + CWV) |
| **P13-3 charter** | [P13-3-index-monitoring-cwv.md](./P13-3-index-monitoring-cwv.md) |
| **Project state** | [PROJECT_STATE.md](../PROJECT_STATE.md) |

---

## P13 milestone map

| ID | Name | Status |
|----|------|--------|
| P13-1 | Google Search Console readiness | ✅ Closed |
| P13-2 | Global visual identity `#0A0A0A` | ✅ Closed |
| P13-3-0 | Charter + CWV SLOs | ✅ Closed |
| P13-3-A | Index Monitoring (scripts + runbook) | ✅ Closed |
| P13-3-B | Core Web Vitals (RUM + Lighthouse gates) | ⏳ Open |
| P13-3 | Index Monitoring + Core Web Vitals (full) | ⏳ Open |
| P13-4 | Bing Webmaster (and follow-on) | ⏳ Blocked until P13-3 |

---

## الهدف / Goal

**Visibility** into platform health: metrics, structured logs, error tracking (Sentry), health endpoints, **index monitoring**, **Core Web Vitals**, and future product analytics — without leaking secrets or PII.

---

## المسؤوليات / Responsibilities

- Request ID propagation
- Latency tracking and in-process metrics
- Sentry initialization and API error capture
- Health/readiness routes
- Admin metrics endpoint (coordination with **P8** display)
- VPS monitor snapshot scripts
- CI verification job

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API lib | `artifacts/api-server/src/lib/observability/**` |
| API routes | `routes/health.ts`, `routes/observability.ts` |
| Middleware | `middlewares/observability.ts` |
| Sentry | `lib/sentry.ts`, `lib/sentry-env.ts` |
| Logger | `lib/logger.ts` |
| Infra | `infra/hetzner/phase6/phase6-vps-monitor-snapshot.sh` |
| CI | `.github/workflows/ci.yml` |
| P13-1 scripts | `artifacts/souq/scripts/validate-p13-1-*.mjs`, `sitemap-ads.mjs` |
| P13-3-A scripts | `scripts/p13-3-index-monitor-lib.mjs`, `validate-p13-3-index-*.mjs` |
| P13-3-A runbook | [P13-3-A-gsc-runbook.md](./P13-3-A-gsc-runbook.md) |
| P13-3-B (planned) | `validate-p13-3-cwv*.mjs`, `src/lib/web-vitals-reporting.ts` |

---

## ما المسموح تعديله / Allowed changes

- New metric dimensions (low cardinality)
- Sentry tags and release tracking
- Alert rules documentation
- STAGING-only log level tuning

---

## ما الممنوع تعديله / Forbidden changes

- Third-party analytics SDKs in frontend without privacy review
- Logging secrets, tokens, or full session cookies
- New admin dashboards without **P8** sign-off

---

## Boundaries

- **Observes** behavior — does not change business logic

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | Log paths, VPS scripts |
| **P1** | Env for Sentry DSN |
| **P8** | Admin metrics UI |

| Used by | Reason |
|---------|--------|
| All P | Instrumentation |

---

## Owner scope

- **Primary:** Observability lead

---

## Scalability notes

- In-process metrics insufficient at multi-replica — export to Prometheus/OTel (**P16**)
- Log aggregation (Loki/ELK) for 1M+ users

---

## P13-3 — Index Monitoring + Core Web Vitals

**Charter:** [P13-3-index-monitoring-cwv.md](./P13-3-index-monitoring-cwv.md)

| Sub-milestone | Deliverable |
|---------------|-------------|
| P13-3-0 | SLOs (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 on primary routes), milestone map, closure criteria |
| P13-3-A | Index monitor scripts extending P13-1; [GSC runbook](./P13-3-A-gsc-runbook.md) |
| P13-3-B | RUM via first-party vitals endpoint; Lighthouse CWV gates |

**CWV SLO owner:** P13 measures and gates; **P9** implements delivery fixes when gates fail.

## Future roadmap (post P13-3)

- Product analytics (funnels) — EU privacy compliant
- Alerting: API p95, error rate, WS disconnects, queue depth (**P15**)
- Bing Webmaster (**P13-4**)

---

## Testing requirements

- `GET /api/healthz`, `/api/readyz` return 200 on STAGING
- Sentry test event on STAGING only
- Unit tests: `request-id.test.mjs`, `latency-tracker.test.mjs`, `sentry*.test.mjs`
- **P13-1:** `pnpm --filter @workspace/souq run gsc:p13:validate` / `gsc:p13:prod`
- **P13-3-A (future):** `index:p13:validate` / `index:p13:prod`
- **P13-3-B (future):** `cwv:p13:validate` / `cwv:p13:prod`

---

## Security notes

- Hash or omit user ids in logs where possible
- Admin metrics route requires admin auth
- No sensitive env in metrics output

---

## Related legacy phase paths

| Legacy | Role |
|--------|------|
| `phase5-collect-baseline.sh` | Load baseline |
| `phase6-vps-monitor-snapshot.sh` | VPS snapshot |

---

## i18n namespace

N/A for metrics; admin metric labels → `p8.admin.metrics.*` when exposed in UI.

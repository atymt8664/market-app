# P13 — Analytics & Observability

| Field | Value |
|-------|-------|
| **Code** | P13 |
| **Status** | Active (partial) — foundations exist; product analytics & alerting evolving |

---

## الهدف / Goal

**Visibility** into platform health: metrics, structured logs, error tracking (Sentry), health endpoints, and future product analytics — without leaking secrets or PII.

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

## Future roadmap

- Product analytics (funnels) — EU privacy compliant
- Alerting: API p95, error rate, WS disconnects, queue depth (**P15**)
- Real User Monitoring (**P9** coordination)

---

## Testing requirements

- `GET /api/healthz`, `/api/readyz` return 200 on STAGING
- Sentry test event on STAGING only
- Unit tests: `request-id.test.mjs`, `latency-tracker.test.mjs`, `sentry*.test.mjs`

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

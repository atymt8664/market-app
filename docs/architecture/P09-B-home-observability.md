# P9-B — Home Observability Layer

| Field | Value |
|-------|-------|
| **Code** | P9-B (Phase B — Observability & Regression Guards) |
| **Parent** | **P9** Performance · **P13** Analytics |
| **Status** | **Active** |
| **Contract (binding)** | [P09-home-stability-contract.md](./P09-home-stability-contract.md) |
| **Baseline** | [P09-home-stability-baseline.md](./P09-home-stability-baseline.md) · [P09-B-home-monitoring-baseline.md](./P09-B-home-monitoring-baseline.md) |

**Related:** [Guard system](../runbooks/P9-B-home-regression-guard-system.md) · [CI strategy](../runbooks/P9-B-ci-validation-strategy.md)

---

## 1. Purpose

Early-warning observability for **Home stability regressions** — not performance optimization. Detect problems **before Production** using:

- Static regression guards (CI)
- RUM vitals already wired (P13-3-B) — **read-only review in Phase B**
- Optional Playwright smoke (STAGING / local preview)
- Admin metrics snapshot (existing API)

**Phase B does not change client runtime behavior, UX, or Home rendering.**

---

## 2. What we monitor

### 2.1 Stability signals (primary — Phase B)

| Signal | Source | Route / scope |
|--------|--------|---------------|
| Featured ↔ Recommended dedupe | Unit test + visual smoke | `/` |
| Shell lifecycle integrity | Static guards + visual smoke | `/` |
| Shell on non-Home | Static guards + visual smoke | `/admin`, `/categories`, … |
| DOM handoff patterns | Static source scan | `src/**` |
| Home-only guard drift | Unit + static | `isHomePathname()` |
| Admin regression | Visual smoke + checklist | `/admin` |
| Flicker / stuck shell | Visual smoke (reload) | `/` refresh |

### 2.2 RUM vitals (existing — P13-3-B, unchanged)

| Signal | Source | Notes |
|--------|--------|-------|
| LCP | `web-vitals-reporting.ts` → `POST /api/observability/vitals` | Route normalized to `/` on Home |
| INP | Same | Scroll/interaction smoothness indicator |
| CLS | Same | Layout stability — baseline 0 |

**Client:** `artifacts/souq/src/lib/web-vitals-reporting.ts`

- Enabled in PROD by default (`VITE_OBSERVABILITY_VITALS_ENABLED` unset)
- Sample rate: 10% prod default (`VITE_OBSERVABILITY_VITALS_SAMPLE_RATE`)
- Deferred 3s after first paint — **does not compete with Home LCP path**
- Payload: `{ route, metric, value, rating }` — no PII

**Server:** `artifacts/api-server/src/routes/observability.ts`

- Rate limit: 120/min/IP
- Server-side sample gate: `OBSERVABILITY_VITALS_SAMPLE_RATE_PERCENT`
- Admin read: `GET /api/observability/metrics` (admin-only)

### 2.3 Console / Best Practices (informational)

| Signal | Source | Phase B action |
|--------|--------|----------------|
| Console errors | Lighthouse / manual | Document only — baseline ~92 BP |
| SW update failures | PSI / register-production-service-worker | Static guard: deferred `update()` at 12s |
| SW mixed bundles | `sw.js` policy | Static guard: HTML network-only |

### 2.4 Service worker diagnostics (static)

| Check | Expected |
|-------|----------|
| HTML navigation | `fetch(req)` network-only — never cache |
| Hashed `/assets/*` | Bypass SW — CDN/browser cache |
| `CACHE_VERSION` | Bumped on SW policy change |
| `controllerchange` | Full reload once — documented flicker risk on deploy |

---

## 3. Severity model

| Level | Meaning | Examples | Action |
|-------|---------|----------|--------|
| **FAIL (deploy block)** | Stability contract broken | G1–G20 guards fail; dedupe test fail; admin shell smoke fail | Block merge / deploy |
| **WARN (investigate)** | Drift signal, not yet user-visible | RUM LCP p75 +500ms vs baseline; BP 92→88 | Ticket; no auto-rollback |
| **INFO** | Tracking only | PSI artifact stored; vitals sample received | Log / dashboard |

### Deploy blockers (FAIL)

1. Any `p9-b:guards` step red in CI
2. Visual smoke FAIL on STAGING pre-deploy (when run)
3. Manual checklist FAIL: **R1, A1, H4, H6**

### Warnings (do not block Phase B CI)

1. LCP above baseline — **not a Phase B gate** (Phase D scope)
2. Console warnings from third-party
3. SW update logged in PSI without user impact

---

## 4. Home lifecycle observability map

```
Event                          Monitored by
─────────────────────────────────────────────────────
Edge shell injected (/)        Static: middleware.js
Shell img load                 Visual: #p7-lcp-candidate
Shell dismissed                Static: lcp-loader dismiss
React featured render          Visual: featured heading + card count
Recommended dedupe             Unit: buildHomeRecommendedFeed
Recommended IO gate            Static: home.tsx IntersectionObserver
Non-Home shell strip           Static: index.html + stripHomeLcpShellIfNotHome
```

---

## 5. Available production logging (read-only inventory)

| Layer | Mechanism | Home relevance |
|-------|-----------|----------------|
| **RUM vitals** | POST `/api/observability/vitals` | LCP/INP/CLS for route `/` |
| **Admin metrics** | GET `/api/observability/metrics` | Aggregated webVitals bucket |
| **Request observability** | API middleware request id | API latency for `/api/ads/featured` |
| **Vercel** | Deployment logs | Build + edge middleware |
| **Lighthouse artifacts** | `.psi-*.json`, `.lighthouse-*.json` | Manual/approved prod reads |

**Not added in Phase B:** new third-party SDKs, new client beacons, new API endpoints.

---

## 6. Review summary — existing wiring (no changes)

### `web-vitals-reporting.ts`

- ✅ Uses `normalizeVitalsRoute()` — Home reports as `/`
- ✅ Sampled, deferred, no PII
- ✅ No change required for Phase B

### Home lifecycle

- ✅ Contract in P09-home-stability-contract.md matches code
- ✅ Dual dismiss (lcp-loader + home.tsx) documented — idempotent

### Console errors

- Baseline Best Practices ~92 — track in monitoring plan; **not fixed in Phase B**

### Service worker

- ✅ Network-only HTML — prevents mixed-bundle regressions
- ✅ Registration after first paint; update deferred 12s

---

## 7. Commands

```bash
# CI + local guard suite (no server required)
pnpm --filter @workspace/souq run p9-b:guards

# Observability wiring readiness
pnpm --filter @workspace/souq run p9-b:observability-readiness

# Optional STAGING / preview smoke (requires running server)
pnpm --filter @workspace/souq run preview
pnpm --filter @workspace/souq run p9-b:visual -- --base=http://127.0.0.1:4173
```

---

*Phase B — observability documentation and guards only. No runtime behavior change.*

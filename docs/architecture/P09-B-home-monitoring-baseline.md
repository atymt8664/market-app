# P9-B — Baseline Monitoring Plan

| Field | Value |
|-------|-------|
| **Code** | P9-B |
| **Status** | **Active monitoring reference** |
| **Frozen baseline** | [P09-home-stability-baseline.md](./P09-home-stability-baseline.md) |
| **Observability** | [P09-B-home-observability.md](./P09-B-home-observability.md) |

---

## 1. Purpose

Define **what to compare against** when monitoring Home stability over time. This is **not** a performance improvement target.

---

## 2. Performance baseline (reference only — WARN tier)

From production verification post Featured Stability Fix. **Degradation triggers WARN, not auto-rollback**, unless paired with stability FAIL.

| Metric | Baseline | WARN threshold | FAIL (stability) |
|--------|----------|----------------|------------------|
| Performance (mobile PSI) | ~82 | <75 | N/A (Phase B) |
| FCP | ~1.8s | >2.5s | N/A |
| LCP | ~4.7s | >5.5s | N/A |
| TBT | 0ms | >50ms | N/A |
| CLS | 0 | >0.05 | **FAIL** if >0.1 with visible jump |
| Accessibility | 100 | <100 | N/A |
| SEO | 100 | <100 | N/A |
| Best Practices | ~92 | <85 | N/A |

**Artifact:** `artifacts/souq/.psi-p7pr14-final-prod.json`

---

## 3. Stability baseline (FAIL tier)

| Check | Baseline expectation | FAIL if |
|-------|---------------------|---------|
| Featured count | All API featured cards visible | Single-card featured strip |
| Featured dedupe | Zero ID overlap with Recommended | Any duplicate `/ad/:id` |
| Shell on `/` | Appears then dismisses ≤2s | Stuck `#p7-lcp-layer` blocking UI |
| Shell on `/admin` | Never present | Home shell or featured strip on admin |
| DOM handoff | Never | `react-lcp-slot`, handoff calls |
| Refresh | No persistent flicker | Reproducible flash >50% reloads |
| Non-Home routes | No shell | `#p7-lcp-candidate` on direct load |

---

## 4. Home baseline

| Dimension | Baseline |
|-----------|----------|
| Boot entry | `lcp-loader.ts` → `main.tsx` → lazy `App` → lazy `Home` |
| Featured staleTime | 2 min |
| Categories staleTime | 10 min |
| Recommended staleTime | 90s |
| Recommended gate | After `featuredFetched` + IO |
| Progressive reveal | initial=0, step=4, idle 1.5s (**Recommended only**) |
| Background | `#0A0A0A` |

---

## 5. Featured baseline

| Dimension | Baseline |
|-----------|----------|
| Owner | React `HomeFeedSections` |
| Render policy | **All** items immediately — `featuredList.map` |
| Lead tile | hero URL, eager, fetchPriority high |
| Dedupe export | IDs fed to `buildHomeRecommendedFeed` |

---

## 6. Admin baseline

| Dimension | Baseline |
|-----------|----------|
| `/admin` load | Admin shell — no Home LCP layer |
| `/admin-login` | Login form — no featured strip |
| Guard | `isHomePathname()` false; inline script strips shell |

Reference: [P08-admin-baseline.md](./P08-admin-baseline.md)

---

## 7. Monitoring cadence

| When | Action | Owner |
|------|--------|-------|
| **Every PR** (CI) | `p9-b:guards` | Automated |
| **Pre-deploy STAGING** | Checklist H4,R1,A1 + optional `p9-b:visual` | Engineer |
| **Post-deploy PROD** (approved) | Checklist A1,R1,H4 smoke | Engineer |
| **Weekly** (optional) | Store PSI artifact; compare WARN thresholds | P9/P13 |
| **On incident** | Rollback per guard system | P0/P9 |

---

## 8. RUM monitoring (existing)

When `OBSERVABILITY_VITALS_ENABLED=1` on API:

| Route | Metrics | WARN |
|-------|---------|------|
| `/` | LCP, INP, CLS | CLS p75 >0.05; INP p75 >200ms |
| `/admin` | LCP, INP | Admin LCP regression vs prior week |

Read via admin `GET /api/observability/metrics` — no new UI in Phase B.

---

## 9. Guard artifact index

| Script | Baseline enforced |
|--------|-------------------|
| `p9-a:validate` | Contract §8 forbidden patterns |
| `validate-p9-b-home-regression-guards.mjs` | Extended B11–B20 |
| `test:home-stability` | Dedupe + path guards |
| `p9-b:visual` | Lifecycle + admin + dedupe smoke |
| `validate-p7-pr-12/14` | Dist shell structure |

---

*Monitoring plan only — no production behavior change in Phase B.*

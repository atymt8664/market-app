# P9-B — Home Regression Guard System

**Authority:** [P09-home-stability-contract.md](../architecture/P09-home-stability-contract.md) · [P9-A guards](./P9-A-home-regression-guards.md)

**Phase B implements** CI wiring + extended guards (B11–B20) + optional visual smoke.

---

## 1. System overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Home Regression Guard System              │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ L1 Unit      │ L2 Static A  │ L2 Static B  │ L3 Build     │
│ test:home-   │ p9-a:        │ p9-b:        │ p7-pr-12/14  │
│ stability    │ validate     │ validate     │ (in build)   │
├──────────────┴──────────────┴──────────────┴──────────────┤
│ L4 Observability readiness │ L5 Visual smoke (optional)   │
│ p9-b:observability-readiness│ p9-b:visual (--base=URL)    │
├─────────────────────────────────────────────────────────────┤
│ L6 Manual checklist (STAGING / prod smoke)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                    p9-b:guards (CI aggregate)
```

---

## 2. Guard catalog

### Phase A guards (G1–G10) — unchanged

See [P9-A-home-regression-guards.md](./P9-A-home-regression-guards.md) §3.

### Phase B extended guards (B11–B20)

| ID | Regression prevented | Detection |
|----|---------------------|-----------|
| **B11** | Featured partial render | `home-feed-sections.tsx`: `featuredList.map` — no `.slice` on featured |
| **B12** | Progressive reveal on featured | No `useProgressiveReveal` for featured strip |
| **B13** | SW caches HTML | `sw.js`: `isHtmlNavigation` → network fetch only |
| **B14** | Sync main entry restored | `index.html` loads `lcp-loader`, not `main.tsx` |
| **B15** | Shell strip missing on boot | `lcp-loader.ts` calls `stripHomeLcpShellIfNotHome()` |
| **B16** | Home lazy route removed | `App.tsx` lazy imports `@/pages/home` |
| **B17** | idleExpand=false on recommended | Contract flicker regression — no `idleExpand:\s*false` on Home feed |
| **B18** | Vitals route not normalized | `web-vitals-reporting.ts` uses `normalizeVitalsRoute` |
| **B19** | Observability docs missing | Phase B doc files exist |
| **B20** | Admin path in home guard | `isHomePathname("/admin")` must be false (unit test) |

### Visual smoke guards (V1–V6) — `p9-b:visual`

| ID | Check | FAIL |
|----|-------|------|
| **V1** | Initial `/` HTML has `#p7-lcp-layer` outside `#root` | Missing or wrong placement |
| **V2** | After load, featured heading visible | Missing |
| **V3** | `/admin` — no `#p7-lcp-candidate` after navigation | Shell img present |
| **V4** | `/categories` — no stuck shell blocking | Layer with candidate persists |
| **V5** | Reload `/` — no stuck shell | `#p7-lcp-layer` blocks after 5s |
| **V6** | Featured/Recommended dedupe | Same `/ad/:id` in both sections |

---

## 3. Coverage matrix

| Risk | G1–G10 | B11–B20 | V1–V6 | Manual |
|------|--------|---------|-------|--------|
| Featured duplication | G5,G9 | — | V6 | R1 |
| Shell visibility | G6,G7 | B14,B15 | V1,V5 | H6 |
| Home-only guards | G10 | B20 | — | — |
| Admin regression | G10 | — | V3 | A1 |
| Non-home routes | G6 | B15 | V4 | N1–N5 |
| Refresh / flicker | G1–G4 | B17 | V5 | RF1 |
| DOM handoff | G1–G4 | — | — | HR2 |
| Lifecycle integrity | G7,G8 | B11,B12,B16 | V1,V2 | H4 |

---

## 4. Aggregate command

```bash
pnpm --filter @workspace/souq run p9-b:guards
```

Runs in order:

1. `test:home-stability`
2. `p9-a:validate`
3. `validate-p9-b-home-regression-guards.mjs`
4. `validate-p9-b-observability-readiness.mjs`

**Requires `dist/` for full p9-a dist checks** — run after `build` in CI.

---

## 5. FAIL → action

| Guard fails | Action |
|-------------|--------|
| CI `p9-b:guards` | Block merge |
| STAGING `p9-b:visual` | Block deploy |
| Prod smoke V3/V6 | Immediate rollback |

---

*Implemented Phase B — no Home runtime behavior change.*

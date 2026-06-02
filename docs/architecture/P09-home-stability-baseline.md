# P9-A — Home Stability Baseline

| Field | Value |
|-------|-------|
| **Code** | P9-A |
| **Status** | **Frozen baseline** — reference for regression comparison |
| **Contract** | [P09-home-stability-contract.md](./P09-home-stability-contract.md) |
| **Captured** | 2026-06-02 post Featured Stability Fix (`999ce68`) |

---

## 1. Production metrics baseline (reference)

Captured from approved production verification after P7 Featured Stability Fix. **Not a performance target** — stability reference only.

| Metric | Baseline value | Notes |
|--------|----------------|-------|
| Accessibility | 100 | Lighthouse mobile |
| SEO | 100 | Lighthouse mobile |
| Performance (mobile) | ~82 | LCP-limited; do not chase in Phase A |
| FCP | ~1.8s | |
| LCP | ~4.7s | LCP element: `#p7-lcp-candidate` (shell img) |
| TBT | 0ms | |
| CLS | 0 | |
| Best Practices | ~92 | Console/SW diagnostics — not Phase A scope |

**PSI artifact reference:** `artifacts/souq/.psi-p7pr14-final-prod.json` (2026-06-02)

---

## 2. Screenshot / visual references

No binary screenshots are committed. Use these **expected visual states** for manual comparison:

### 2.1 Home — cold load (mobile)

| Element | Expected |
|---------|----------|
| Background | Solid `#0A0A0A` — no white flash |
| Header | Fixed search bar + category strip + divider |
| Featured section | Heading "إعلانات مميزة" + horizontal strip of **all** featured cards |
| Featured lead | First card image visible; no lone single-card state |
| Recommended section | Heading below divider; grid loads after scroll/near gate |
| Bottom nav | Visible after React mount |

### 2.2 Home — after React hydration

| Check | Expected |
|-------|----------|
| Featured count | Same or more cards than shell preview (never fewer) |
| Featured ↔ Recommended | **Zero** duplicate ad IDs between sections |
| Scroll featured strip | Smooth horizontal scroll; no layout jump |
| CLS | No header height jump after categories load |

### 2.3 Refresh / hard refresh

| Action | Expected |
|--------|----------|
| Soft refresh (`F5`) | Brief shell possible; transitions to full React feed; **no persistent flicker** |
| Hard refresh (`Ctrl+Shift+R`) | Same; no stuck shell overlay; no single-card featured state |
| Back to Home from `/ad/:id` | Normal SPA navigation; shell **not** re-injected |

### 2.4 Admin (`/admin`)

| Check | Expected |
|-------|----------|
| Page loads | Admin login or dashboard — **not** Home LCP shell |
| No `#p7-lcp-layer` | Shell stripped on non-Home routes |
| No featured strip | Admin UI unaffected |

### 2.5 Non-Home routes

| Route | Expected |
|-------|----------|
| `/ad/:id` | Ad detail; no shell |
| `/categories` | Category list; no shell |
| `/search?q=…` | Search results; no shell |
| `/login` | Auth page; no shell |

---

## 3. Home lifecycle baseline

```
T0  Document received (Edge shell on / only)
T1  #p7-lcp-layer visible with lead featured img (#p7-lcp-candidate)
T2  lcp-loader waits img load (≤2s timeout)
T3  dismissHomeLcpLayer() — shell removed
T4  main.tsx boots — home-critical.css applied
T5  React mounts — Home header + categories query
T6  Featured query resolves — HomeFeedSections renders ALL featured cards
T7  Recommended IO gate fires — recommended query starts
T8  Progressive reveal expands recommended grid on scroll/idle
```

**FAIL indicators:**

- Shell visible after T6 without dismissal
- Only one featured card at T6+
- Featured ad id visible in both Featured and Recommended at T6+

---

## 4. Featured lifecycle baseline

| Stage | State |
|-------|-------|
| Prefetch | `startHomeLcpPrefetch()` + Edge middleware may fetch same API |
| Query | `useListFeaturedAds` staleTime 2min |
| Filter | `filterHomeFeedAds()` removes test ads |
| Render | All items in `HorizontalScrollStrip` immediately |
| Lead tile | `featuredLead={index===0}` — hero URL, eager, high priority |
| Dedupe export | IDs passed implicitly to `buildHomeRecommendedFeed` |

---

## 5. Recommended lifecycle baseline

| Stage | State |
|-------|-------|
| Gate | Disabled until `featuredFetched === true` |
| IO trigger | `recommendedGateRef` intersection → `setRecommendedQueryEnabled(true)` |
| City branch | If `feedCity` → prefer city ads; fallback to default recommended |
| Dedupe | `buildHomeRecommendedFeed(raw, featuredForHome)` |
| Render | Progressive: 0 initial → +4 per scroll sentinel or idle 1.5s |
| Skeleton | 4 grid skeletons while loading |

---

## 6. Automated baseline artifacts

| Artifact | Purpose |
|----------|---------|
| `scripts/validate-p9-a-home-stability.mjs` | Source + dist regression guards |
| `src/lib/home-feed-ads.test.mjs` | Dedupe unit tests |
| `src/lib/p7-home-path.test.mjs` | Home path guard tests |
| `scripts/validate-p7-pr-12-home-shell.mjs` | Dist shell structure (build hook) |
| `scripts/validate-p7-pr-14-lcp-stabilization.mjs` | lcp-loader entry (build hook) |
| `scripts/validate-p9-b-home-regression-guards.mjs` | Extended B11–B20 guards |
| `scripts/validate-p9-b-observability-readiness.mjs` | RUM wiring readiness |
| `scripts/visual/p9-b-home-stability-smoke.mjs` | Optional STAGING visual smoke |

---

## 7. Baseline commits (code reference)

| Commit | Description |
|--------|-------------|
| `62e0267` | Remove DOM handoff; React owns all featured cards |
| `999ce68` | Dedupe featured from recommended; earlier shell dismiss in lcp-loader |
| `39c8ee8` | Restrict Home LCP shell to `/` only — restore `/admin` |

---

*This baseline documents expected behavior. Phase B may add filmstrip capture scripts; Phase A does not change runtime behavior.*

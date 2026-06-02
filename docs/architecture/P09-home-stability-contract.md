# P9-A — Home Stability Contract

| Field | Value |
|-------|-------|
| **Code** | P9-A (Phase A — Stability Lock) |
| **Parent** | **P9** Performance · **P3** Browse/Home · **P11** PWA shell |
| **Status** | **Active — binding contract** |
| **Authority** | SSOT for Home cold-path behavior after P7 Featured Stability Fix (`62e0267`, `999ce68`) |
| **Charter** | [CONSTITUTION.md](./CONSTITUTION.md) · [P03-browse-home.md](./P03-browse-home.md) · [P09-performance.md](./P09-performance.md) |

**Related:** [Baseline](./P09-home-stability-baseline.md) · [Checklist](../runbooks/P9-A-home-stability-checklist.md) · [Regression guards](../runbooks/P9-A-home-regression-guards.md)

---

## 1. Purpose

Lock the **current stable production behavior** of Home before any future performance work (Phase B+). This contract prevents recurrence of:

- Flicker / flash on refresh
- Featured ads duplicated inside Recommended
- `/admin` broken by Home LCP shell
- Shell/React ownership conflicts
- DOM handoff regressions (P7-PR-14)

**No performance optimization is authorized while this contract is the active gate.**

---

## 2. Ownership matrix

| Concern | Owner | Must NOT be owned by |
|---------|-------|----------------------|
| **Home LCP shell lifecycle** | `lcp-loader.ts` + `home-lcp-handoff.ts` | React components, AdCard, handoff slot |
| **Shell HTML injection** | Edge middleware (`middleware.js`) on **exact `GET /` only** | All routes, `/admin`, `/ad/:id` |
| **Shell visibility** | `#p7-lcp-layer` (sibling of `#root`, outside React tree) | `#root` innerHTML |
| **Shell dismissal** | `dismissHomeLcpLayer()` — primary in `lcp-loader.ts` after shell LCP paint; safety call in `home.tsx` when featured query settles | DOM handoff, moving shell `<img>` into React |
| **Featured cards (all tiles)** | React — `HomeFeedSections` → `HomeFeedAdCard` | Edge shell (shell shows **lead preview only** for LCP, not interactive feed) |
| **Recommended cards** | React — `HomeFeedSections` grid + `useProgressiveReveal` | Edge shell, categories gate |
| **Featured ↔ Recommended dedupe** | `buildHomeRecommendedFeed()` in `lib/home-feed-ads.ts` | API layer changes (forbidden in Phase A) |
| **Home-only guards** | `isHomePathname()` in `lib/p7-home-path.ts` | Path string literals scattered in code |
| **Non-Home routes** | `stripHomeLcpShellIfNotHome()` — no shell, no LCP wait | Shared shell on SPA navigations |

---

## 3. Shell lifecycle (binding)

### 3.1 When shell **appears**

| Condition | Behavior |
|-----------|----------|
| `GET /` + human HTML accept + not crawler | Edge middleware injects preload + `#p7-lcp-layer` with `#p7-lcp-candidate` img |
| Local preview (no Vercel) | Vite build may inject shell via `injectHomeHtmlShell()` when API available |
| Any path **≠ `/`** | Shell **must not** appear — inline script in `index.html` removes `#p7-lcp-layer` immediately |

### 3.2 When shell **disappears**

| Step | Actor | Action |
|------|-------|--------|
| 1 | `lcp-loader.ts` | Wait for `#p7-lcp-candidate` load/error or `HOME_LCP_MAX_WAIT_MS` (2000ms) |
| 2 | `lcp-loader.ts` | Call `dismissHomeLcpLayer()` — remove `#p7-lcp-layer` from DOM |
| 3 | `lcp-loader.ts` | `import("./main")` — boot React |
| 4 | `home.tsx` | When featured query settled (`featuredFetched`), call `dismissHomeLcpLayer()` again (idempotent safety) |

**Forbidden:** moving shell `<img>` into React (`handoffShellLcpToReact`), hiding `#root img` via `p7-await-handoff` class toggling, or showing only one featured card (`HOME_FEATURED_INITIAL`).

### 3.3 Boot sequence (reference)

```
GET / → Edge shell HTML
  → lcp-loader.ts (strip shell if not /)
  → wait shell LCP img
  → dismissHomeLcpLayer()
  → main.tsx (prefetch featured, defer SW/fonts/styles)
  → App.tsx (lazy Home)
  → home.tsx (parallel categories + featured queries)
  → HomeFeedSections (lazy chunk — all featured + progressive recommended)
```

---

## 4. Featured cards contract

| Rule | Detail |
|------|--------|
| **Render owner** | React only — `home-feed-sections.tsx` |
| **Count** | **All** featured ads from API render immediately when data available — no `initial=1` gate |
| **Lead image** | First tile uses `getAdImageHeroUrl()` + `fetchPriority=high` + `loading=eager` |
| **Other featured tiles** | `getAdImageThumbUrl()` + lazy loading |
| **Component** | `HomeFeedAdCard` — **not** full `AdCard` (no auth/favorite on cold path) |
| **Shell relationship** | Shell img is LCP **preview only**; React re-renders lead tile independently — **no DOM reuse** |

---

## 5. Recommended cards contract

| Rule | Detail |
|------|--------|
| **Fetch gate** | `recommendedQueryEnabled` — IntersectionObserver on gate ref, only after `featuredFetched` |
| **Data source** | City ads if `feedCity` set and non-empty; else `useListRecommendedAds` fallback |
| **Dedupe (mandatory)** | `buildHomeRecommendedFeed(recommendedRaw, featuredForHome)` — featured IDs **never** appear in Recommended |
| **Progressive reveal** | `useProgressiveReveal` with `initial=0`, `step=4`, `idleExpandMs=1500` |
| **Test ads filter** | `filterHomeFeedAds()` removes CSRF/staging seed ads from both feeds |

---

## 6. Dedupe rules (normative)

```typescript
// lib/home-feed-ads.ts — sole dedupe authority for Home Recommended
buildHomeRecommendedFeed(recommended, featured)
  = excludeFeaturedFromRecommended(
      filterHomeFeedAds(recommended),
      collectFeaturedAdIds(featured)
    )
```

| Scenario | Expected |
|----------|----------|
| Ad id `42` in Featured | Must **not** appear in Recommended |
| Featured empty | Recommended shows filtered list unchanged |
| Recommended undefined | Returns `[]` |
| Overlap 3 ads | All 3 excluded from Recommended |

**Any Home Recommended change must call `buildHomeRecommendedFeed` — inline filter forbidden.**

---

## 7. Home-only guards (normative)

`isHomePathname(pathname)` returns true **only** for exact `/` (after `BASE_URL` strip).

| File | Guard usage |
|------|-------------|
| `lcp-loader.ts` | LCP wait + dismiss only on Home |
| `main.tsx` | Featured prefetch + QueryClient seed only on Home |
| `home-lcp-handoff.ts` | `stripHomeLcpShellIfNotHome()` on boot |
| `index.html` inline script | Remove shell when `pathname !== "/"` |
| `middleware.js` | Edge shell only when `url.pathname === "/"` |

**Regression FAIL:** shell logic applied to `/admin`, `/ad/123`, or any non-root path.

---

## 8. DOM handoff — permanently forbidden

The following patterns caused production regressions and are **banned**:

| Pattern | Status |
|---------|--------|
| `handoffShellLcpToReact()` moving shell img to React slot | **Deprecated — must return false / no-op** |
| `beginHomeLcpHandoffAwait()` hiding React images | **Deprecated — no-op** |
| `REACT_LCP_SLOT_ID` / `react-lcp-slot` mount point | **Removed from render path** |
| `html.p7-await-handoff #root img { content-visibility: hidden }` active toggling | **CSS may exist; class must never be added in runtime** |
| `HOME_FEATURED_INITIAL=1` single-card featured strip | **Removed — forbidden** |
| Partial featured reveal blocking LCP supersession | **Forbidden without contract amendment** |

---

## 9. Files in contract scope

| Path | Role |
|------|------|
| `artifacts/souq/index.html` | Shell placeholder + non-Home strip script |
| `artifacts/souq/middleware.js` | Edge shell injection |
| `artifacts/souq/scripts/home-lcp-shell.mjs` | Shell HTML builder |
| `artifacts/souq/src/lcp-loader.ts` | Zero-React LCP phase |
| `artifacts/souq/src/main.tsx` | Boot + prefetch |
| `artifacts/souq/src/lib/home-lcp-handoff.ts` | Dismiss/strip API |
| `artifacts/souq/src/lib/p7-home-path.ts` | Home path guard |
| `artifacts/souq/src/lib/home-lcp-prefetch.ts` | Featured prefetch |
| `artifacts/souq/src/lib/home-feed-ads.ts` | Dedupe + test-ad filter |
| `artifacts/souq/src/pages/home.tsx` | Home orchestration |
| `artifacts/souq/src/pages/home-feed-sections.tsx` | Featured + Recommended UI |
| `artifacts/souq/src/components/home-feed-ad-card.tsx` | Feed tile |

---

## 10. Change control

| Change type | Requirement |
|-------------|-------------|
| Any edit to §9 files | Run `pnpm --filter @workspace/souq run p9-a:validate` + checklist |
| Performance optimization | **Blocked** until Phase B+ explicitly opened in PROJECT_STATE |
| Contract amendment | P3 + P9 owner review; update this doc first |
| Production deploy touching §9 | Mohamed approval + full checklist PASS |

---

## 11. Verification commands

```bash
pnpm --filter @workspace/souq run p9-b:guards
pnpm --filter @workspace/souq run test:home-stability
pnpm --filter @workspace/souq run p9-a:validate
pnpm --filter @workspace/souq run typecheck
pnpm --filter @workspace/souq run build
pnpm --filter @workspace/souq run i18n:check
pnpm --filter @workspace/souq run p9-b:visual -- --base=<STAGING_URL>
```

Manual: [P9-A-home-stability-checklist.md](../runbooks/P9-A-home-stability-checklist.md)

---

*Last updated: P9-A Phase A — Stability Lock (2026-06-02)*

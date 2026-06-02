# P3 — Browse / Home / Discovery

| Field | Value |
|-------|-------|
| **Code** | P3 |
| **Status** | Active |

---

## الهدف / Goal

Help users **discover** listings: home feed shell, category navigation, search UI shell, and location/map UX for browsing (not ad creation logic).

---

## المسؤوليات / Responsibilities

- Home page and category listing pages
- Marketplace search bar and location picker (browse context)
- Category API consumption (`GET /categories`)
- City/location data loading for EU (+ Americas data files)
- Interactive maps on ad detail (display-only UX shared with P4 page)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `artifacts/api-server/src/routes/categories.ts` |
| Pages | `pages/home.tsx`, `categories.tsx`, `category.tsx` |
| Components | `marketplace-search-bar.tsx`, `search-location-*.tsx`, `location-picker*.tsx`, `city-select.tsx`, `ad-detail-interactive-map.tsx`, `ad-detail-location-card.tsx` |
| Lib | `lib/home-feed-ads.ts`, `lib/locations/**`, `lib/search-location.ts`, `lib/marketplace-location-countries.ts` |
| i18n (target) | `p3.browse.*` |

---

## ما المسموح تعديله / Allowed changes

- Navigation UX, feed layout, category tree display
- Location picker behavior for search/browse
- Performance optimizations with **P9** coordination

---

## ما الممنوع تعديله / Forbidden changes

- Ad CRUD and storage (**P4**)
- Search ranking weights and FTS (**P14**)
- Admin category CRUD (**P8**)

---

## Boundaries

- Consumes **P4** list APIs and **P14** search APIs — does not own `ads` table writes

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P4** | Ad data |
| **P9** | Load performance |
| **P14** | Search ordering (future) |

---

## Owner scope

- **Primary:** Browse squad (may share **Developer A** with P4)
- **Reviews:** P9 for perf, P14 for search UX

---

## Scalability notes

- Static city JSON via lazy loaders — CDN-friendly
- Home feed should stay cacheable; personalized feed → **P14**

---

## Future roadmap

- Trending categories
- Geo-default city from IP (privacy-reviewed)
- Full `p3.browse.*` i18n namespace

---

## Home stability contract (P9-A)

**Binding:** [P09-home-stability-contract.md](./P09-home-stability-contract.md) · [Baseline](./P09-home-stability-baseline.md) · [Checklist](../runbooks/P9-A-home-stability-checklist.md)

Any Home cold-path change must pass `p9-b:guards` before deploy (Phase B CI).

---

## Testing requirements

- Manual: home, categories, search navigation on STAGING
- Visual: `scripts/visual/prod-p9-map-tap-check.mjs` (with **P9**)
- `i18n:check` for new strings
- Home stability: `p9-a:validate`, `test:home-stability`, [P9-A checklist](../runbooks/P9-A-home-stability-checklist.md)

---

## Security notes

- No PII in location logs
- Map tiles from approved providers only (CSP in `vercel.json` — **P0**)

---

## Related legacy phase paths

None specific; Lighthouse files under **P9** (`.lighthouse-*`).

---

## i18n namespace

**Target:** `p3.browse.*`

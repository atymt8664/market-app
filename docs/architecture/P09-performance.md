# P9 — Performance & Speed

| Field | Value |
|-------|-------|
| **Code** | P9 |
| **Status** | Active |

---

## الهدف / Goal

**Fast perceived UX**: image transforms, preload/decode, lazy routes, query cache tuning, map interaction perf, and Lighthouse budgets.

---

## المسؤوليات / Responsibilities

- Client image URL transforms and preload cache
- Crossfade gallery without layout thrash
- `after-first-paint` scheduling (incl. i18n deferral coordination)
- React Query stale times
- API pagination helpers (shared with list endpoints)
- Visual regression / Lighthouse artifact scripts

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| Frontend lib | `lib/ad-image-url.ts`, `ad-image-preload.ts`, `query-stale-times.ts`, `after-first-paint.ts`, `deferred-fonts.ts` |
| Components | `ad-image-crossfade.tsx`, `ad-images-public.tsx`, `ad-detail-hero-section.tsx` |
| API lib | `lib/pagination.ts` (shared — coordinate **P4**) |
| Scripts | `artifacts/souq/scripts/visual/prod-p9-map-tap-check.mjs` |
| Artifacts | `artifacts/souq/.lighthouse-*.json` |
| i18n | Gate prefetch timing in `i18n/index.ts` (coordinate **P3**) |

---

## ما المسموح تعديله / Allowed changes

- Caching headers on static assets (with **P0** Vercel headers)
- Image sizes, lazy loading, component memoization
- Perf-related query defaults

---

## ما الممنوع تعديله / Forbidden changes

- Search ranking (**P14**)
- Redis/caching infrastructure (**P16**) without spike
- Business rules for ad visibility (**P4**)

---

## Boundaries

- Optimizes delivery — does not change product outcomes

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P4** | Images |
| **P3** | Maps |
| **P0** | CDN/nginx cache |

---

## Owner scope

- **Primary:** **Developer D**

---

## Scalability notes

- Supabase image transforms — monitor bandwidth costs
- RUM and Core Web Vitals → **P13**

---

## Future roadmap

- Core Web Vitals SLOs + gates → **P13-3** ([charter](./P13-3-index-monitoring-cwv.md)); P9 implements fixes when P13 CWV gates fail
- Edge caching strategy for API list responses (with **P16**)

---

## Testing requirements

- Lighthouse runs stored as `.lighthouse-*.json` (local/CI artifact)
- `prod-p9-map-tap-check.mjs` on STAGING/production URL (approved)
- Frontend build must pass in CI

---

## Security notes

- No PII in perf logs
- CSP must allow image CDNs — coordinate **P7** / **P0**

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `.lighthouse-phase5.json`, `phase6a/b`, `7a6` | Audit snapshots |

---

## i18n namespace

Uses shared loader — no separate namespace; perf-related strings under owning P (e.g. `p4.ads.*`).

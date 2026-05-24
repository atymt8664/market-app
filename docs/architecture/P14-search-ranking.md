# P14 — Search & Ranking

| Field | Value |
|-------|-------|
| **Code** | P14 |
| **Status** | Active (FTS) — advanced ranking & recommendations evolving |

---

## الهدف / Goal

**Find listings fast** with relevant ordering: full-text search, filters, facets at scale, and future personalized ranking / recommendations.

---

## المسؤوليات / Responsibilities

- Search query engine (`ad-search.ts`, utilities)
- List/query merge for home and search feeds
- FTS schema and migrations
- Search page UX
- Synonyms and multilingual tuning (DE/AR/EN)
- A/B ranking hooks (future)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `lib/ad-search.ts`, `ad-search-util.ts`, `ads-list-query.ts`, `ads-list-merge.ts` |
| Schema | `lib/db/src/schema/ads-search.ts`, migration `014_phase_7a4_ad_search_fts.sql` |
| Frontend | `pages/search.tsx`, search-related hooks |
| i18n (target) | `p14.search.*` |

---

## ما المسموح تعديله / Allowed changes

- Indexes, FTS config, ranking weights (STAGING load test first)
- Search UX and filters

---

## ما الممنوع تعديله / Forbidden changes

- Ad CRUD and visibility rules (**P4**)
- Production index rebuild without STAGING load test + rollback plan
- Changing default sort without migration communication

---

## Boundaries

- **Read-heavy** on **P4** data — no direct ad ownership mutations

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P4** | Ads data |
| **P9** | Result caching / perf |
| **P15** | Background index refresh (future) |
| **P16** | Redis cache for hot queries (future) |

---

## Owner scope

- **Primary:** Search squad

---

## Scalability notes

- Postgres FTS viable to ~high hundreds of thousands / low millions with tuning
- Beyond that: Typesense/Elasticsearch + **P15** index workers
- Materialized views for hot sorts

---

## Future roadmap

- Personalized home/search ranking
- Geo boost and seller trust signals (**P7**)
- `p14.search.*` i18n

---

## Testing requirements

- `ad-search-util.test.mjs`, `ads-list-query.test.mjs`
- STAGING search latency checks under load (**P16** baseline)
- Compare result counts before/after index migration

---

## Security notes

- Search must respect ad visibility and blocks (**P4**, **P7**)
- No SQL injection — parameterized Drizzle only

---

## Related legacy phase paths

| Legacy | Topic |
|--------|-------|
| `010`–`014` migrations | Indexes + FTS |
| `phase5-staging-load-smoke.sh` | Load baseline (**P0/P13**) |

---

## i18n namespace

**Target:** `p14.search.*`

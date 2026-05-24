# P4 — Listings / Ads

| Field | Value |
|-------|-------|
| **Code** | P4 |
| **Status** | Active |

---

## الهدف / Goal

Own the **listing lifecycle**: create, edit, view, hide, moderate, images, likes/favorites/views, and featured/recommended surfaces.

---

## المسؤوليات / Responsibilities

- Ads REST API (`routes/ads.ts`)
- Storage/upload routes (`routes/storage.ts`)
- Ad visibility, image normalization, Supabase storage integration
- OpenAPI entries for ad endpoints (with `lib/api-spec`)
- Drizzle schema: `ads`, `ad-reaction-counts`, related migrations
- Frontend: create/edit/detail, ad cards, image gallery
- `@workspace/object-storage-web` upload components

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/ads.ts`, `storage.ts`, `lib/ad-visibility.ts`, `normalize-ad-image.ts`, `supabaseStorage.ts`, `ads-list-query.ts`, `ads-list-merge.ts`, `ad-reaction-counts*.ts`, `pagination.ts` |
| Schema | `lib/db/src/schema/ads.ts`, `ad-reaction-counts.ts`, migrations `010`–`013` |
| Frontend pages | `create-ad.tsx`, `edit-ad.tsx`, `ad-detail.tsx`, `favorites.tsx`, `stats.tsx` |
| Components | `ad-card.tsx`, `create-ad-*`, `ad-detail-*`, `ad-images-public.tsx` |
| Package | `lib/object-storage-web/` |
| i18n (target) | `p4.ads.*` (legacy: `ad_detail.*`, `create_ad.*`, etc.) |

---

## ما المسموح تعديله / Allowed changes

- Ad schema (with migration + **P7** if RLS affected)
- List/detail/create flows
- Upload pipeline (coordinate **P15** for async processing later)

---

## ما الممنوع تعديله / Forbidden changes

- Chat threads (**P5**)
- Payment capture (**P10**)
- Default search ranking (**P14**) without migration plan
- Auth/session (**P2**)

---

## Boundaries

- **Source of truth** for `ads` and reaction tables
- **P14** reads for search; **P5** references `adId` only

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P2** | Owner user |
| **P1** | Storage buckets per env |
| **P9** | Image delivery perf |
| **P12** | AI on create flow |
| **P7** | Reports on ads |

---

## Owner scope

- **Primary:** **Developer A**
- **Coordinates:** `lib/db` schema changes affecting other tables

---

## Scalability notes

- FTS indexes in migrations `010`–`014` — tune with **P14**
- Large pages (`create-ad.tsx` ~2600 lines) — split planned for maintainability
- Image processing → **P15** workers at scale

---

## Future roadmap

- Split `create-ad.tsx` into feature modules
- Video listings
- Bulk seller tools
- `p4.ads.*` i18n consolidation

---

## Testing requirements

- API unit tests: `ads-list-query.test.mjs`, `ad-reaction-counts.test.mjs`, etc.
- STAGING: create → upload images → publish → view → favorite
- `i18n:check` for UI changes

---

## Security notes

- Upload size/type validation
- Ad moderation statuses — admin actions via **P8** APIs on same routes (admin-only handlers)

---

## Related legacy phase paths

| Migration / artifact | Topic |
|----------------------|-------|
| `010_phase_7a1_listing_indexes.sql` | List perf |
| `011`–`013` | Views, reactions |
| `014_phase_7a4_ad_search_fts.sql` | FTS (**P14** shared) |

---

## i18n namespace

**Target:** `p4.ads.*`

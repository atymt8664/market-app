# P17 — Listing Lifecycle & Retention Architecture

| Field | Value |
|-------|-------|
| **Domain** | P4 Listings · P17 Commerce retention |
| **Status** | **Accepted — implementation** |
| **Parent** | [P04-listings-ads.md](./P04-listings-ads.md) · [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md) |
| **Code SSOT** | `artifacts/api-server/src/lib/ad-lifecycle.ts` |

---

## 1. Problem statement

Production verified (2026-06-20):

1. Seller «delete» on ad linked to **completed** order → `409 AD_DELETE_LINKED_ORDERS` — UX feels broken.
2. Hard `DELETE` is **impossible** while `orders.ad_id → ads.id` uses `ON DELETE RESTRICT`.
3. Chat reopen after delete-for-me can show stale thread UI when React Query serves cached messages (`refetchOnMount: false`, 60s staleTime).

This document defines the **long-term lifecycle** (Marketplace-grade), not a patch.

---

## 2. Lifecycle model

```
                    ┌─────────────┐
                    │   pending   │  moderation queue
                    └──────┬──────┘
                           │ approve
                           ▼
                    ┌─────────────┐
         ┌─────────│  approved   │────────── public home / search / ad URL
         │         └──────┬──────┘
         │ reject         │
         ▼                │ order completes (display only — status stays approved until seller acts)
  ┌─────────────┐         │
  │  rejected   │         │ seller «delete» + terminal orders only
  └─────────────┘         ▼
                   ┌──────────────────────┐
                   │ archived_by_seller   │  seller UX = gone; row retained
                   └──────────┬───────────┘
                              │ future P15 compliance tier
                              ▼
                   ┌──────────────────────┐
                   │ retained_for_history │  (reserved — not auto-set in P17)
                   └──────────┬───────────┘
                              │ future admin / P15 job
                              ▼
                   ┌──────────────────────┐
                   │ eligible_for_cleanup │  (policy-only — no runtime status yet)
                   └──────────────────────┘
```

**Parallel admin path:** `hidden` (moderation) — never used for seller archive.

---

## 3. State rules

| Status | Set by | Seller my-ads | Public surfaces | Ad URL `/ad/:id` | Orders FK |
|--------|--------|---------------|-----------------|------------------|-----------|
| `pending` | create / re-review | ✅ | ❌ | owner only | — |
| `approved` | moderation | ✅ | ✅ | ✅ | — |
| `rejected` | moderation | ✅ | ❌ | owner only | — |
| `hidden` | **admin** | ❌ | ❌ | admin / owner | — |
| `archived_by_seller` | seller remove + terminal orders | ❌ | ❌ | **404 all** | **retained** |
| `retained_for_history` | future P15 | ❌ | ❌ | 404 | retained |

### Seller remove (`DELETE /api/ads/:id`)

| Linked orders | Action | HTTP |
|---------------|--------|------|
| none | Hard delete row | 204 |
| any **active** (not completed/cancelled) | Block | 409 `AD_DELETE_LINKED_ORDERS` |
| **terminal only** | Transition → `archived_by_seller` | 204 |

**Never** hard-delete when `orders.ad_id` references the listing.

---

## 4. Visibility rules

| Surface | Filter |
|---------|--------|
| Home / featured / search | `approved` only |
| Public profile ads (`GET /api/ads?userId=`) | `approved` only |
| Seller «إعلاناتي» (`GET /api/ads/mine`) | `pending`, `approved`, `rejected` |
| Ad detail | `shouldExposeAdDetailToViewer()` in ad-lifecycle |
| Chat referenced ads | `isPublicListingStatus` → `available: false` when archived |
| Admin panel | all statuses |

---

## 5. Retention rules

| Data | After archive |
|------|----------------|
| `orders` row | unchanged · `ad_id` FK intact |
| `order_items` snapshot (`title`, `imageUrl`, `unitPrice`) | unchanged — **order UI source of truth** |
| `order_status_history` / shipping | unchanged |
| `conversations.ad_id` / references | row kept; ad unavailable in chat bar |
| Admin audit | row kept with `archived_by_seller` |
| Sentry | no FK 23503 on seller remove |

**Future (P15):** `retained_for_history` → `eligible_for_cleanup` batch job with legal retention window — **out of scope** for this package.

---

## 6. Chat fresh-start (P5 consolidation preserved)

| Layer | Behaviour |
|-------|-----------|
| Delete-for-me | Per-user `conversation_deletes` |
| Reopen same buyer/seller pair | Same `convId` (consolidation) |
| Reopen after delete | `reopenConversationFreshStartForUser` → `message_hides` for deleter |
| Referenced ads bar (0 visible msgs) | Newest `conversation_ad_references` entry — not stale `conv.ad_id` if unique update failed |
| Frontend | `bustConversationThreadCache()` on delete + startConversation; `refetchOnMount: true` on thread |

**Seller** always sees full thread history (by design — not a deleter fresh-start).

---

## 7. Impact matrix (archived ad)

| Page / system | Breaks? |
|---------------|---------|
| Order detail / timeline | **No** — uses `order_items` snapshot |
| Shipping history | **No** |
| Buyer/seller order lists | **No** |
| Chat (other party) | **No** — ad shows unavailable |
| Home / search / profile | **No** — excluded |
| Public `/ad/:id` | **404** — intended |
| Admin | **No** |

---

## 8. Rollback plan

1. Revert API deploy to previous image tag.
2. Revert frontend deploy.
3. Rows already `archived_by_seller` remain valid — optional admin SQL to set `approved` if emergency (not automated).

---

## Phase Continuity Lock

| Field | Value |
|-------|-------|
| **Closed** | P17 Listing Lifecycle & Retention (seller archive + chat cache) |
| **Next** | Deploy + production re-verify ad 88 + chat reopen; then P9-3 or P17-8 pkg4 per PROJECT_STATE |

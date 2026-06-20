# P17-8 Package 3 — Manual Post-Shipped Completion Loop

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Sub-phase** | **P17-8 Package 3** — Manual post-shipped completion |
| **Parent** | [P17-8-0-tracking-timeline-ux-lock.md](./P17-8-0-tracking-timeline-ux-lock.md) · [P17-7-shipping-workflow.md](./P17-7-shipping-workflow.md) · [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md) |
| **Status** | **Open — local verify PASS (2026-06-20) · pending Mohamed approval · no commit/deploy** |
| **Runtime** | API + frontend — manual transitions only |

---

## 0. Scope boundary

### In scope (Package 3)

| Area | Detail |
|------|--------|
| **Entry state** | `orders.status = shipped` (P17-7 exit) |
| **Exit state** | `orders.status = completed` |
| **Seller manual** | `shipped → in_transit → delivered` |
| **Buyer manual** | `delivered → buyer_confirmed → completed` (system completes inline) |
| **History** | `order_status_history` append per transition |
| **Shipments** | `delivered_at` on `delivered` |
| **Shipment events** | Optional append `in_transit` / `delivered` with `source=seller_manual` |
| **UI** | Seller CTAs + buyer confirm receipt + tracking track follows status |
| **Bug fix** | Tracking subtitle `undefined` fallback |

### Out of scope (explicit)

| Excluded | Phase |
|----------|-------|
| Carrier APIs (DHL, DPD, UPS, GLS, Hermes) | P17-17 |
| Carrier webhooks | P17-17 |
| `out_for_delivery` as separate step | Optional v2 — skipped in minimal loop |
| Ratings / reviews platform | Future |
| Trust score expansion | P17-12+ |
| Push notifications expansion | P17-9 |
| Auto-complete SLA cron | P15 |
| DB migrations | Not required — statuses exist in P17-3 schema |

---

## 1. State transitions (binding)

| # | From | To | Action | Actor | Event code |
|---|------|-----|--------|-------|------------|
| 1 | `shipped` | `in_transit` | `mark_in_transit` | seller | `shipment_in_transit` |
| 2 | `in_transit` | `delivered` | `mark_delivered` | seller | `shipment_delivered` |
| 3 | `delivered` | `buyer_confirmed` | `confirm_receipt` | buyer | `buyer_confirmed_receipt` |
| 4 | `buyer_confirmed` | `completed` | `complete_order` | system | `order_completed` |

**Buyer confirm API:** `POST /orders/:id/confirm-receipt` runs rows 3+4 in one idempotent transaction.

**Pickup branch:** unchanged — does not use post-ship loop.

---

## 2. API endpoints

| Method | Path | Actor | Guard |
|--------|------|-------|-------|
| POST | `/api/orders/:id/mark-in-transit` | seller | shipping mode · status=`shipped` |
| POST | `/api/orders/:id/mark-delivered` | seller | shipping mode · status=`in_transit` |
| POST | `/api/orders/:id/confirm-receipt` | buyer | status=`delivered` |

Illegal state → **409** `ORDER_INVALID_STATE`. Wrong party → **403**.

---

## 3. Actor permissions

| Action | Allowed when |
|--------|--------------|
| Seller mark in transit | Own order · shipping · `shipped` |
| Seller mark delivered | Own order · shipping · `in_transit` |
| Buyer confirm receipt | Own order · `delivered` |
| Seller confirm receipt | **Forbidden** |
| Buyer mark in transit / delivered | **Forbidden** |

---

## 4. Rollback

- API deploy: revert Docker tag / Vercel deployment.
- No schema migration — rollback is code-only.
- History is append-only; admin force-change remains P8 future.

---

## 5. Tests (required before deploy)

| Check | Script |
|-------|--------|
| State machine unit | `order-state-machine.test.mjs` |
| Full post-ship API loop | `p17-8-pkg3-staging-flow-verify.mjs` |
| P17-7 regression | `p17-7:staging-flow` |
| P17-8 pkg1/pkg2 | `p17-8:pkg1:validate` · `p17-8:pkg2:validate` |
| Browser visual | `p17-8-pkg3-browser-flow.mjs` |
| Pre-play regression | `.tmp-round2-preplay-audit.mjs` |

---

## 6. Production safety

- No new DB columns or migrations.
- Idempotent transitions — repeat POST returns 200 with same state.
- Optimistic lock on `order.version` — stale write → 409.
- Legacy orders at `shipped` remain valid; new actions optional.

---

*Package 3 closes the manual commerce loop before Google Play staging gate.*

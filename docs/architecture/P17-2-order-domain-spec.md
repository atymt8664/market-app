# P17-2 — Order Domain Specification

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Phase** | P17-2 — Order Domain Specification |
| **Status** | **Spec only** — no DB, no API, no frontend implementation |
| **Horizon** | 10–50 years — millions of orders, append-only history, idempotent transitions |

**Parent charter:** [P17-commerce-orders.md](./P17-commerce-orders.md)  
**UX reference:** [P17-1-ux-spec.md](./P17-1-ux-spec.md) · [P17-1-i18n-draft.md](./P17-1-i18n-draft.md)  
**Exposure layer:** P17-1B (Coming Soon — production placeholders only)

---

## Purpose

Define the **complete order domain model**, state machine, permissions, timeline contract, SLA rules, and cross-P integration contracts **before** any database migration or API work (P17-3+).

**P17-2 is not implementation.** No SQL, no Drizzle, no routes, no workers.

---

## 1. Order Domain Model

Conceptual entities only. Field types are indicative for future schema design — not executable DDL.

### 1.1 Order

The root aggregate for a buyer-initiated transaction on a listing.

| Attribute (future) | Type / notes |
|--------------------|--------------|
| `id` | UUID (internal PK) |
| `order_number` | Human-readable, e.g. `SOUQ-2026-001042` — unique, display-only |
| `status` | Canonical enum — see §2 |
| `buyer_user_id` | FK → users (**P2** session subject) |
| `seller_user_id` | FK → users |
| `ad_id` | FK → ads (**P4**) — source listing at order time |
| `fulfillment_mode` | `shipping` \| `pickup` |
| `currency` | ISO 4217, e.g. `EUR` |
| `subtotal_amount` | Snapshot from listing price |
| `shipping_amount` | Snapshot at confirm |
| `total_amount` | `subtotal + shipping` (v1 — no tax line until policy defined) |
| `buyer_address_id` | FK → BuyerAddress snapshot ref (nullable for pickup) |
| `idempotency_key` | Client/server key for create — future unique index |
| `issue_flag` | Boolean — true when `issue_opened` or active OrderIssue |
| `sla_deadline_at` | Next SLA checkpoint (nullable) |
| `created_at` / `updated_at` | Timestamps |
| `confirmed_at` / `completed_at` / `cancelled_at` | Milestone timestamps |
| `version` | Optimistic lock counter for transitions |

**Invariants**

- Immutable **commercial snapshot** at transition from `draft` → `pending_confirmation`: product title, image URL, price, shipping method label, address summary.
- One active order per `(buyer, ad)` in non-terminal states unless prior order terminal (future business rule).
- **No payment fields** on Order in v1 — see Payment placeholder (§1.8).

### 1.2 OrderItem

Line item(s). v1 expects **one item per order** (single ad); model supports 1..N for future cart.

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `order_id` | FK |
| `ad_id` | Snapshot source |
| `title` | Copied at confirm |
| `image_url` | Copied at confirm |
| `unit_price` | Copied at confirm |
| `quantity` | Default `1` in v1 |
| `condition_label` | Optional snapshot |
| `metadata` | JSON — specs one-liner, SKU future |

### 1.3 OrderStatusHistory

Append-only audit of every status transition and system event.

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `order_id` | FK |
| `from_status` | Nullable for create |
| `to_status` | Canonical enum |
| `actor_type` | `buyer` \| `seller` \| `system` \| `admin` |
| `actor_user_id` | Nullable for system |
| `event_code` | Machine name, e.g. `seller_confirmed_order` |
| `public_message_ar` | User-visible timeline text (Arabic default) |
| `internal_note` | Admin/system only — never shown to buyer/seller |
| `metadata` | JSON — tracking number, reason codes, admin reason |
| `created_at` | Immutable |

**Rule:** Never UPDATE or DELETE rows — corrections via compensating admin events only.

### 1.4 BuyerAddress

Delivery address **snapshot** for an order. Profile saved addresses live under **P6**; P17 copies at confirm.

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `order_id` | FK — 1:1 per order in v1 |
| `label` | e.g. المنزل |
| `city` | Required |
| `country_code` | Required |
| `postal_code` | Optional by country |
| `line1` / `line2` | Encrypted or RLS-protected PII (**P7** review at schema) |
| `recipient_name` | Optional |
| `phone` | Optional — E.164 |
| `source_address_id` | Nullable — link to P6 saved address if copied |

### 1.5 Shipment

Physical shipping leg (null for `pickup` fulfillment).

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `order_id` | FK 1:1 |
| `carrier_code` | e.g. `dhl`, `hermes` — enum later |
| `carrier_label` | Display name at ship time |
| `tracking_number` | Seller-entered v1 — no carrier API |
| `shipped_at` | Set on `shipped` transition |
| `estimated_delivery_at` | Optional manual/future |
| `delivered_at` | Set on `delivered` |

### 1.6 ShipmentEvent

Carrier-style tracking events (v1: seller/manual; future: webhook ingest).

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `shipment_id` | FK |
| `event_code` | `picked_up` \| `in_transit` \| `out_for_delivery` \| `delivered` |
| `description_ar` | Public timeline text |
| `occurred_at` | Event time |
| `source` | `seller_manual` \| `system` \| `carrier_webhook` (future) |

### 1.7 OrderIssue

Buyer-reported problem — “يوجد مشكلة؟” flow.

| Attribute | Notes |
|-----------|--------|
| `id` | UUID |
| `order_id` | FK |
| `category` | Enum — see §7 |
| `status` | `open` \| `under_review` \| `resolved` \| `closed` |
| `description` | Optional free text |
| `opened_by_user_id` | Buyer |
| `assigned_admin_id` | Nullable (**P8**) |
| `resolution_code` | Nullable |
| `resolved_at` | Nullable |
| `freezes_auto_complete` | Boolean — default true while open |

### 1.8 Payment (placeholder — **P10 only**)

**Not implemented in v1.** Documented for future integration without merging P10 into P17 ownership.

| Future entity | Owner | Notes |
|---------------|-------|-------|
| `OrderPayment` | **P10** | External payment intent id, provider, amount, status |
| `payment_status` on Order | **P10** sub-state | Parallel to order fulfillment — `none` in v1 |
| Future states | See §2.2 | `pending_payment`, `paid`, `refunded`, `payout_*` |

**Contract:** P17 order may reference `payment_ref_id` (nullable FK to P10 ledger) when both exist — never store card data on Order.

### 1.9 TrustSignal (placeholder — **P6 / P7**)

**Not computed in v1.** Append-only signals P17 emits for future trust scoring.

| Signal type | Emitted when |
|-------------|--------------|
| `order_completed` | → `completed` |
| `order_cancelled_buyer` / `order_cancelled_seller` | → `cancelled` |
| `seller_confirm_latency_ms` | `pending_confirmation` → `confirmed` |
| `seller_ship_latency_ms` | `confirmed` → `shipped` |
| `buyer_receipt_confirmed` | `buyer_confirmed` |
| `issue_opened` / `issue_resolved` | OrderIssue lifecycle |

Stored future table: `order_trust_signals` (order_id, signal_type, payload, created_at) — **P7** consumes for fraud; **P6** for private seller stats — **no public score**.

---

## 2. Order Status Machine

### 2.1 V1 canonical statuses (no real payment)

| Status | Buyer label (ar) | Seller label (ar) | Terminal |
|--------|------------------|-------------------|----------|
| `draft` | إتمام الطلب | — | No |
| `pending_confirmation` | بانتظار تأكيد البائع | يحتاج تأكيدك | No |
| `seller_confirmation_required` | بانتظار تأكيد البائع | تأكيد مطلوب | No — *alias view* of `pending_confirmation` for seller UI |
| `confirmed` | تم تأكيد الطلب | جهّز الشحنة | No |
| `preparing` | قيد التجهيز | قيد التجهيز | No |
| `shipped` | تم الشحن | تم الشحن | No |
| `in_transit` | قيد الشحن | قيد الشحن | No |
| `out_for_delivery` | خرج للتسليم | خرج للتسليم | No |
| `delivered` | تم التسليم | بانتظار تأكيد المشتري | No |
| `buyer_confirmed` | تم تأكيد الاستلام | اكتمل تقريبًا | No |
| `completed` | اكتمل الطلب | اكتمل الطلب | **Yes** |
| `cancelled` | ملغى | ملغى | **Yes** |
| `issue_opened` | يوجد بلاغ مفتوح | يوجد بلاغ مفتوح | No — *overlay*; canonical status may remain pre-terminal |

**Note:** `seller_confirmation_required` is a **presentation alias** for sellers when `status = pending_confirmation`. Single canonical status in DB; dual labels in API/UI.

**Note:** `issue_opened` is modeled as **`issue_flag = true`** plus active OrderIssue; primary `status` stays at last fulfillment state until resolved or admin acts.

### 2.2 Deferred payment / dispute statuses (**P10 / future — not v1**)

| Status | Owner | When |
|--------|-------|------|
| `pending_payment` | P10 | Checkout with gateway enabled |
| `paid` | P10 | Payment captured |
| `refunded` | P10 | Refund processed |
| `disputed` | P7 + P10 | Chargeback / formal dispute |
| `payout_pending` | P10 | Seller payout queue |
| `payout_completed` | P10 | Payout settled |

These **must not** appear in v1 migrations or API.

### 2.3 State diagram (v1 fulfillment)

```
draft
  └─ buyer confirms summary ──▶ pending_confirmation
pending_confirmation
  ├─ seller confirms ──▶ confirmed
  ├─ seller rejects ──▶ cancelled
  └─ buyer cancels ──▶ cancelled
confirmed
  └─ seller starts prep ──▶ preparing
preparing
  └─ seller marks shipped (+ tracking) ──▶ shipped
shipped
  └─ carrier/manual ──▶ in_transit
in_transit
  └─ ──▶ out_for_delivery
out_for_delivery
  └─ ──▶ delivered
delivered
  ├─ buyer confirms receipt ──▶ buyer_confirmed ──▶ completed
  └─ system auto-complete (SLA) ──▶ completed
any (pre-shipped, no open issue)
  └─ buyer/seller/admin cancel rules ──▶ cancelled
any (with rules)
  └─ buyer opens issue ──▶ issue_flag=true (issue_opened overlay)
pickup branch: confirmed ──▶ preparing ──▶ delivered (skip shipped/in_transit/out_for_delivery)
```

---

## 3. Transition Rules

Each row: **from → to**, actor, condition, public message (ar), notification event, history event, rollback, failure handling.

| From | To | Actor | Condition | Public message (ar) | Notification | History event | Rollback | Failure handling |
|------|-----|-------|-----------|---------------------|--------------|---------------|----------|------------------|
| — | `draft` | buyer | Opens checkout from ad | — | — | `checkout_started` | N/A | Idempotent create |
| `draft` | `pending_confirmation` | buyer | Order Summary Preview confirmed; valid address/shipping | تم إنشاء طلبك — بانتظار تأكيد البائع | `order.created` | `order_submitted` | No | 409 if draft expired; retry with idempotency key |
| `pending_confirmation` | `confirmed` | seller | Seller accepts | تم تأكيد الطلب من البائع | `order.confirmed` | `seller_confirmed_order` | Admin only | 403 if not seller; 409 if not pending |
| `pending_confirmation` | `cancelled` | seller | Seller rejects | تم رفض الطلب من البائع | `order.rejected` | `seller_rejected_order` | Admin only | Same |
| `pending_confirmation` | `cancelled` | buyer | Before seller confirms | تم إلغاء الطلب | `order.cancelled` | `buyer_cancelled_order` | No | 403 if already confirmed |
| `pending_confirmation` | `cancelled` | system | Seller confirm SLA exceeded (P15 future) | تم إلغاء الطلب — لم يستجب البائع | `order.cancelled` | `seller_confirm_timeout` | Admin restore | Job idempotent |
| `confirmed` | `preparing` | seller | Seller starts packing | البائع يجهّز طلبك | `order.preparing` | `seller_started_preparing` | No | — |
| `confirmed` | `cancelled` | buyer | Policy: before ship only | تم إلغاء الطلب | `order.cancelled` | `buyer_cancelled_order` | Admin only | Block if shipped |
| `preparing` | `shipped` | seller | Tracking + carrier provided (shipping) | تم شحن طلبك | `order.shipped` | `seller_marked_shipped` | Admin only | Validate tracking format |
| `preparing` | `delivered` | seller | Pickup ready / handoff | جاهز للاستلام | `order.delivered` | `seller_marked_pickup_ready` | Admin only | Pickup mode only |
| `shipped` | `in_transit` | seller/system | Manual or shipment event | طلبك قيد الشحن | `order.in_transit` | `shipment_in_transit` | No | — |
| `in_transit` | `out_for_delivery` | system/seller | Shipment event | طلبك خرج للتسليم | `order.out_for_delivery` | `shipment_out_for_delivery` | No | — |
| `out_for_delivery` | `delivered` | system/seller | Delivered scan / seller confirm | تم تسليم الطلب | `order.delivered` | `shipment_delivered` | Admin only | — |
| `delivered` | `buyer_confirmed` | buyer | Buyer confirms receipt | شكرًا — تم تأكيد الاستلام | — | `buyer_confirmed_receipt` | No | — |
| `buyer_confirmed` | `completed` | system | Immediate or batch | اكتمل الطلب | `order.completed` | `order_completed` | Admin only | — |
| `delivered` | `completed` | system | Auto-complete window elapsed, no open issue | اكتمل الطلب | `order.completed` | `auto_completed_order` | Admin only | Skipped if issue open |
| any eligible | `cancelled` | admin | Force cancel with reason | تم إلغاء الطلب من الدعم | `order.cancelled` | `admin_cancelled_order` | No | Audit reason required |
| any | issue overlay | buyer | Opens issue (§7) | تم تسجيل بلاغك | `order.issue_opened` | `buyer_opened_issue` | Admin resolve | Freezes auto-complete |

**Failure handling (global)**

- All transitions: **idempotent** — repeat request returns 200 with same state.
- Optimistic lock on `order.version` — 409 on stale write.
- Side effects (push, email): **P15** queue — API writes history first.
- Blocked users (**P7**): 403 on create and on actor transitions.

---

## 4. Actor Permissions

### 4.1 Buyer

| Action | Allowed when |
|--------|--------------|
| Create `draft` / submit order | Logged in; not seller of ad; not blocked; ad visible |
| Confirm address / shipping in draft | Own draft only |
| Cancel | `pending_confirmation` (and policy-defined pre-ship states) |
| Open issue | Post-submit until `completed`; not if already open duplicate category |
| Confirm receipt | `delivered` |
| View timeline / order detail | Own orders only (RLS) |
| Message seller | **P5** link — not P17 mutation |

### 4.2 Seller

| Action | Allowed when |
|--------|--------------|
| Accept / reject order | `pending_confirmation`; own listing |
| Mark preparing | `confirmed` |
| Add tracking + mark shipped | `preparing`; shipping mode |
| Mark pickup ready / delivered | `preparing`; pickup mode |
| Advance in_transit / out_for_delivery | Optional v1 manual; v2 shipment events |
| Cancel | Reject at pending; after confirm only via policy/admin |
| View seller order queue | Own seller_user_id |

**Seller UX cap (P17-1):** Max **3 primary actions** visible: confirm → prepare → ship.

### 4.3 System

| Action | Trigger |
|--------|---------|
| Auto-complete | `delivered` + SLA window + no open issue |
| Seller confirm timeout | `pending_confirmation` + SLA (**P15**) |
| Shipping timeout flags | SLA scan — notify only v1 |
| Notification dispatch | On history event (**P15** fan-out) |
| Order number generation | On submit — unique sequential per year prefix |

### 4.4 Admin (**P8** shell, **P17** rules)

| Action | Requirement |
|--------|-------------|
| Force status change | Reason code + audit (`OrderStatusHistory`, `actor_type=admin`) |
| Resolve / escalate issue | Issue queue |
| Cancel with refund note | Links to P10 future — no refund execution in v1 |
| View full audit trail | Internal + public history |
| SLA exceeded queue | Read-only until action |

---

## 5. Order Timeline Contract

### 5.1 Public timeline (buyer & seller)

Ordered events shown in UI (Arabic copy — i18n keys future `p17.commerce.timeline.*`):

| Order | Event code | Arabic text | Shipping | Pickup |
|-------|------------|-------------|----------|--------|
| 1 | `order_submitted` | تم إنشاء الطلب | ✓ | ✓ |
| 2 | `awaiting_seller` | بانتظار تأكيد البائع | ✓ | ✓ |
| 3 | `seller_confirmed_order` | تم تأكيد الطلب | ✓ | ✓ |
| 4 | `seller_started_preparing` | قيد التجهيز | ✓ | ✓ |
| 5 | `seller_marked_shipped` | تم الشحن | ✓ | — |
| 6 | `shipment_in_transit` | قيد الشحن | ✓ | — |
| 7 | `shipment_out_for_delivery` | خرج للتسليم | ✓ | — |
| 8 | `shipment_delivered` / pickup | تم التسليم | ✓ | ✓ (pickup: “تم التسليم / الاستلام”) |
| 9 | `buyer_confirmed_receipt` | تم تأكيد الاستلام | Optional show | Optional |
| 10 | `order_completed` | اكتمل الطلب | ✓ | ✓ |

**UX answers (mandatory per step):** أين أنا؟ · ماذا يحدث؟ · ماذا أفعل؟ · هل أنا بأمان؟ · ما الخطوة التالية؟

- **Active step** highlighted (lime); completed steps checkmarked; future steps muted.
- **Cancelled / issue:** insert banner above timeline — not hidden steps.

### 5.2 Internal timeline (admin only)

Additional events never shown to users:

- `seller_confirm_timeout`, `admin_cancelled_order`, `admin_force_status`
- SLA breach markers
- Fraud hold flags (**P7**)
- Idempotency retries, notification job failures ( **P13** )

### 5.3 Pickup vs shipping

| Aspect | Shipping | Pickup |
|--------|----------|--------|
| BuyerAddress | Required snapshot | Optional / city only |
| Shipment entity | Required | Null |
| Timeline steps 5–7 | Shown | **Skipped** — UI collapses to prepare → delivered |
| Tracking | Required at ship | Hidden |
| Seller CTA | تأكيد → تجهيز → تم الشحن | تأكيد → تجهيز → جاهز للاستلام |

---

## 6. SLA Rules (spec only — **P15** implements later)

Default proposals — tunable via admin settings future; not enforced in v1 code.

| SLA | Duration (proposal) | Starts | Action on breach |
|-----|---------------------|--------|------------------|
| Seller confirmation | 24 hours | `pending_confirmation` | Notify buyer + seller → auto-cancel optional (config) |
| Seller ship / pickup ready | 72 hours | `confirmed` | Notify + flag in admin SLA queue |
| Buyer receipt confirm | 7 days | `delivered` | Auto-complete if no issue |
| Issue first response | 48 hours | `issue_opened` | Escalate to admin queue |
| Issue resolution target | 7 days | issue assigned | Admin dashboard metric |

**v1:** SLAs stored as spec defaults only; workers in §12 apply later.

---

## 7. Order Issue Rules

Categories align with [P17-1 UX](./P17-1-ux-spec.md).

| Category | Code | What happens | Visible to | Admin required | Stops auto-complete | User message (ar) |
|----------|------|--------------|------------|----------------|---------------------|-------------------|
| لم أستلم الطلب | `not_received` | Issue record; notify seller + admin queue | Buyer, seller, admin | Review if no ship proof | **Yes** | تم تسجيل بلاغك — سنراجع حالة الشحن |
| المنتج مختلف عن الوصف | `not_as_described` | Freeze; admin may mediate | All parties | **Yes** (high) | **Yes** | تم تسجيل بلاغك — سيتواصل معك الدعم |
| المنتج تالف | `damaged` | Same | All | **Yes** | **Yes** | تم تسجيل بلاغك — سيتم مراجعة حالة المنتج |
| مشكلة في الشحن | `shipping_problem` | Notify seller; admin if tracking invalid | All | If unresolved 48h | **Yes** | تم تسجيل بلاغك — جاري متابعة الشحن |
| مشكلة أخرى | `other` | Ticket to admin | Buyer, admin | **Yes** | **Yes** | تم تسجيل بلاغك — سيتواصل معك الفريق |

**v1 submit:** UI only records intent in future API — P17-1 mock does not send.

**Resolution paths (future):** `resolved_buyer_satisfied`, `resolved_refund` (P10), `resolved_cancelled`, `closed_no_action`.

---

## 8. Trust Score Integration Spec (**P6** — future, private)

P17 **emits signals**; P6/P7 **consume** — no public trust score in v1.

| Signal | Source | Future use (P6 private stats) |
|--------|--------|-------------------------------|
| Orders completed | count | Seller reliability |
| Cancellation rate | buyer/seller cancels | Risk flag |
| Shipping speed | confirm → shipped duration | Seller badge internal |
| Confirmation speed | pending → confirmed | Seller responsiveness |
| Issues count | OrderIssue | Quality flag |
| Issue resolution | time + outcome | Seller quality |
| Buyer confirmed receipt | boolean | Completion quality |
| Seller response speed | message optional **P5** | Not P17 core |

**Rules:** Aggregates computed async (**P15**); never shown as single public number until product decision + **P7** approval.

---

## 9. P7 Trust & Safety Integration

| Integration | Behavior |
|-------------|----------|
| Blocked users | Cannot create order if buyer blocked seller or reverse |
| Reports | Order may link `report_id` if buyer reports from order detail |
| Fraud signals | Velocity: max N orders/hour/buyer (edge + app) |
| Repeated cancellations | Signal to **P7** after threshold |
| Repeated issues | Escalate seller review queue |
| High value orders | Future threshold → manual review hold before `confirmed` |
| RLS | Buyer/seller/admin-only row access — **P7** reviews policies at P17-3 schema phase |

**No implementation in P17-2.**

---

## 10. P8 Admin Integration Spec (future UI)

| Surface | Purpose |
|---------|---------|
| Orders list | Filter by status, SLA breached, issue open |
| Order detail | Snapshot, parties, timeline (internal + public) |
| Status history | Full append-only log |
| Buyer / seller links | Jump to admin user detail |
| Issue queue | Open OrderIssues by category/age |
| SLA exceeded queue | Confirm/ship/receipt breaches |
| Force status | With reason — writes admin history event |
| Audit trail | Export for support — no PII in logs (**P13**) |

**No Admin UI in P17-2.** Spec only for P8 planning.

---

## 11. P11 Notifications Contract

Event names are stable contracts for **P15** producers and **P11** delivery.

| Event | Recipient(s) | Title (ar) | Body (ar) | Deep link (future) |
|-------|----------------|------------|-----------|---------------------|
| `order.created` | seller | طلب جديد | لديك طلب جديد على «{title}» | `/orders/seller/{order_number}` |
| `order.confirmed` | buyer | تم تأكيد طلبك | أكّد البائع طلب {order_number} | `/orders/{order_number}` |
| `order.rejected` | buyer | تم رفض الطلب | رفض البائع طلب {order_number} | `/orders/{order_number}` |
| `order.preparing` | buyer | جاري التجهيز | البائع يجهّز طلبك | `/orders/{order_number}` |
| `order.shipped` | buyer | تم الشحن | طلبك في الطريق — {tracking} | `/orders/{order_number}` |
| `order.in_transit` | buyer | قيد الشحن | طلبك قيد الشحن | `/orders/{order_number}` |
| `order.out_for_delivery` | buyer | خرج للتسليم | طلبك خرج للتسليم اليوم | `/orders/{order_number}` |
| `order.delivered` | buyer | تم التسليم | يرجى تأكيد استلام طلبك | `/orders/{order_number}` |
| `order.completed` | buyer, seller | اكتمل الطلب | اكتمل طلب {order_number} | `/orders/{order_number}` |
| `order.cancelled` | buyer, seller | تم الإلغاء | تم إلغاء طلب {order_number} | `/orders/{order_number}` |
| `order.issue_opened` | seller, admin | بلاغ على طلب | تم فتح بلاغ لطلب {order_number} | `/orders/{order_number}` |
| `order.issue_updated` | buyer | تحديث البلاغ | تم تحديث بلاغك | `/orders/{order_number}` |

**v1:** No notification implementation. Existing P11 infra used when P17-3+ ships.

---

## 12. P15 Workers Future Contract

| Job | Schedule / trigger | Idempotent | Notes |
|-----|-------------------|------------|-------|
| `order.auto_complete_delivered` | Cron / queue | Yes | §6 buyer window |
| `order.seller_confirm_timeout` | SLA scan | Yes | → cancelled optional |
| `order.seller_ship_timeout` | SLA scan | Yes | Notify + admin flag |
| `order.sla_scan` | Hourly | Yes | Populate admin SLA queue |
| `order.notification_fan_out` | On history insert | Yes | Decouple from API |
| `order.issue_escalation` | 48h open | Yes | Admin queue |
| `order.cleanup_drafts` | Daily | Yes | Delete `draft` older than TTL (e.g. 24h) |

**No workers in P17-2.**

---

## 13. P16 Scale Considerations

Design constraints for future schema (P17-3) and query patterns:

| Topic | Direction |
|-------|-----------|
| Pagination | **Keyset** on `(created_at, id)` for buyer/seller lists — no OFFSET at scale |
| Indexes (future) | `(buyer_user_id, created_at DESC)`, `(seller_user_id, status, created_at DESC)`, unique `(order_number)`, unique `(idempotency_key)` |
| History | **Append-only** `OrderStatusHistory` — never update |
| Aggregates | No live `COUNT(*)` on hot seller dashboard — rollups via **P15** or materialized views later |
| Hot rows | Avoid updating wide Order row on every tracking ping — ShipmentEvent append |
| Order numbers | Sequence or prefixed generator — not MAX(id) |
| Idempotency | `Idempotency-Key` header on POST create / transitions |
| Audit | Admin actions immutable; correlate with **P13** request_id |
| Partitioning (long-term) | By `created_at` month if >10M rows — document only |

---

## 14. Out of Scope (P17-2 and until approved P17-3+)

Explicitly **forbidden** in current phase:

- DB migrations / Drizzle schema / RLS SQL
- API routes / OpenAPI / generated clients
- Frontend routes beyond P17-1B Coming Soon placeholders
- Real orders, checkout, payments
- Stripe, PayPal, carrier APIs
- Admin orders UI (real)
- Notification delivery
- Queue workers
- Production rollout / deploy
- **P17-3** and later — **not started** without Mohamed approval

**P10 remains separate:** payment states in §2.2 are documented for future bridge only.

---

## P17 phase alignment

| Phase | Deliverable | Status |
|-------|-------------|--------|
| P17-0 | Charter | ✅ Closed |
| P17-1 | UX mock + emotion map | ✅ Closed |
| P17-1B | Coming Soon exposure | ✅ Closed |
| **P17-2** | **This document** | ✅ Spec |
| P17-3 | Schema + RLS (STAGING) | Not started |
| P17-4 | Order API + OpenAPI | Not started |
| P17-5 | Production UI (gated) | Not started |
| P17-6 | Rollout + hardening | Not started |

---

## Verification checklist (P17-2)

| Check | Result |
|-------|--------|
| Domain model defined | §1 |
| V1 + deferred payment states | §2 |
| Transition rules with notifications | §3 |
| Actor permissions | §4 |
| Timeline contract | §5 |
| SLA spec | §6 |
| Issue rules | §7 |
| P6/P7/P8/P11/P15/P16 integration | §8–§13 |
| No executable SQL | ✓ |
| P10 separate | §1.8, §2.2, §14 |
| Links to P17-0 / P17-1 | Header |

---

*P17-2 — Order Domain Specification. Documentation only. No runtime impact.*

# P17-8-0 — Order Tracking Timeline UX / Motion / Architecture Lock

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Sub-phase** | **P17-8-0** — Specification lock (documentation only) |
| **Phase** | **P17-8** — Tracking timeline (implementation deferred) |
| **Status** | **Closed — Mohamed APPROVED 2026-06-07** |
| **Runtime impact** | **None** — no UI, API, DB, deploy, commit in this phase |

**Parent charter:** [P17-commerce-orders.md](./P17-commerce-orders.md)  
**Shipping handoff:** [P17-7-shipping-workflow.md](./P17-7-shipping-workflow.md)  
**Domain spec:** [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md)  
**Buyer flow:** [P17-5-ui.md](./P17-5-ui.md)

**Execution gate:** No P17-8 code until **P17-8-0 closed** (this document + Mohamed sign-off). P17-8 implementation is a **separate task**.

---

## 0. Scope boundary

### In scope (P17-8-0 — this document)

UX, motion, visual, wireframe, and architecture boundaries for the buyer/seller **Order Tracking Track** — documentation only.

### Out of scope (deferred)

| Phase | Excluded |
|-------|----------|
| **P17-8 impl** | Runtime code — separate task |
| **P17-9** | Push notifications |
| **P17-17** | Carrier API webhooks (DHL, DPD, GLS, UPS, Hermes) |
| **P5 Chat** | No chat changes |
| **P17-CART** | Not opened |

---

## 1. Canonical mobile track (Mohamed approval — final)

### 1.1 Reference shape (6 nodes — shipping)

**Mobile-first baseline** — equal segments, uniform spacing, compact for small screens:

```
●━━━━●━━━━◉━━━━○━━━━○━━━━○
```

| Symbol | Meaning |
|--------|---------|
| `●` | Completed node |
| `◉` | **Current** node (glow + light pulse) |
| `○` | Future node |
| `━` | Segment — **equal length** between every pair of nodes |

### 1.2 Layout rules (binding)

| # | Rule |
|---|------|
| L1 | **All segments same length** — CSS `grid` or `flex` with equal `1fr` units; no variable gaps |
| L2 | **Uniform node spacing** — nodes sit on segment junctions only |
| L3 | **Mobile first** — designed for 320–390px width inside card padding |
| L4 | **No oversized gaps** — max segment length capped; track fits card without empty margins |
| L5 | **No numeric progress bar** | 
| L6 | **No percentages** |
| L7 | **RTL first** — first step (تم الطلب) anchors **right**; progress advances **left** toward delivery |
| L8 | **No annoying animation** — subtle only; respect `prefers-reduced-motion` |

### 1.3 RTL rendering

Logical order (right → left on screen):

```
تم التسليم ○━━━━○━━━━○━━━━◉━━━━●━━━━● تم الطلب
           (future)      (current) (completed → right anchor)
```

Labels sit **below** each node; truncate with ellipsis on narrow screens.

### 1.4 Node states

| State | Visual |
|-------|--------|
| **Completed** | Filled lime circle `●` (20px); optional micro-check |
| **Current** | Ring `◉` (24px), **light glow** `rgba(194,235,108,0.35)`, **light pulse** 2s ease-in-out |
| **Future** | Hollow circle `○` (16px), `zinc-600` stroke |

### 1.5 Segment / line

| Segment type | Style |
|--------------|--------|
| Completed → completed | Solid lime 2px |
| Completed → current | Solid lime + **subtle flow shimmer** toward current (350ms loop, low opacity) |
| Current → future | `zinc-800` 2px (solid or faint dash) |
| Future → future | `zinc-800` muted |

**Motion intent:** gradual movement **toward the next stage** — not a loading bar, not a percentage.

### 1.6 Six buyer steps (shipping)

| # | Label (AR) | Domain mapping |
|---|------------|----------------|
| 1 | تم الطلب | `order_submitted` / pending |
| 2 | تم التأكيد | `seller_confirmed_order` |
| 3 | قيد التجهيز | `seller_started_preparing` |
| 4 | تم الشحن | `seller_marked_shipped` |
| 5 | في الطريق | `in_transit` or `out_for_delivery` |
| 6 | تم التسليم | `delivered` |

**Pickup:** 4 nodes — skip shipped + in-transit (see P17-2 §5.3).

### 1.7 Visual identity (frozen)

- Background `#0A0A0A`
- Card `ORDERS_CARD_COMPACT` + `border-primary/20`
- Lime accent primary
- RTL, mobile-first, card-based UI
- Forbidden: `bg-card`, `zinc-900/950` shells, non-brand backgrounds

### 1.8 Buyer metadata (no date flood)

| Field | When shown |
|-------|------------|
| آخر تحديث | Always — relative time |
| تاريخ الطلب | Always — one chip |
| تاريخ الشحن | If `shipped_at` |
| تاريخ التسليم | If `delivered` |
| ETA | Only if data exists — never guessed |

Max **3 date chips** below track.

---

## 2. Architecture boundaries (P17-8 implementation — future)

| In P17-8 | Out of P17-8 |
|----------|--------------|
| `OrderTrackingTrack` component | P17-9 notifications |
| Replace/enhance vertical timeline | Carrier webhooks (P17-17) |
| Mapping status → 6 nodes | WebSocket push |
| Pickup 4-node variant | New DB tables |
| i18n `p17.commerce.tracking.*` | State machine changes beyond P17-2 |
| Read enrichment optional (`shippedAt`, `etaAt`) | P5 Chat changes |

**Carrier future (design only):** DHL, DPD, GLS, UPS, Hermes → logo + external link v1; webhooks v2.

---

## 3. Wireframe — buyer detail (mobile)

```
┌──────────────────────────────┐
│ تتبع الطلب                    │
│ آخر تحديث: في الطريق · منذ 2 س │
│                              │
│  ○━━━○━━━○━━━◉━━━●━━━●       │  ← RTL, equal ━━━
│ تسليم … طريق … شحن … طلب     │  ← labels under nodes
│                              │
│ [12 يون] [شحن 14 يون]        │  ← ≤3 chips
│ DHL · TRK… [نسخ]             │
└──────────────────────────────┘
```

**Responsive:** equal segments scale with card width; horizontal scroll only if viewport < minimum track width (5 × 36px segments + nodes).

---

## 4. Definition of Done — P17-8-0

| # | Criterion | Status |
|---|-----------|--------|
| 0-1 | Spec document exists | ✓ |
| 0-2 | Mobile canonical track `●━━━━●━━━━◉━━━━○━━━━○━━━━○` adopted | ✓ |
| 0-3 | Equal segments + uniform spacing locked | ✓ |
| 0-4 | Mohamed sign-off | ✓ APPROVED 2026-06-07 |
| 0-5 | **No runtime changes** | ✓ |

---

*P17-8-0 — Tracking Timeline UX Lock. Documentation only.*

**Implementation:** [P17-8-pkg1-closure.md](./P17-8-pkg1-closure.md) — Package 1 closed (Mohamed visual APPROVED 2026-06-07). Package 2+ not opened.

# P17 — Commerce, Orders & Fulfillment

| Field | Value |
|-------|-------|
| **Code** | P17 |
| **Status** | **Charter (P17-0)** — architecture docs only; no runtime implementation |
| **Phase** | P17-0 closed when this doc + index + PROJECT_STATE decision land |
| **Horizon** | 10–50 year marketplace — order volume comparable to major classified platforms |

**Charter:** [CONSTITUTION.md](./CONSTITUTION.md) · **Index:** [README.md](./README.md)

---

## Goal

Introduce a **durable commerce layer** for Souq Arab EU: buyer-initiated orders from listings, seller fulfillment, order lifecycle tracking, and buyer/seller coordination — **without** collapsing into monetization (P10) or messaging (P5).

P17 enables the platform to evolve from “contact seller via chat” toward structured **Buy Now → confirm → fulfill → complete** flows comparable to Facebook Marketplace / eBay / Kleinanzeigen — at scale (millions of orders, notifications, and status transitions).

**P17-0 deliverable:** this charter only. No schema, API, UI in production, or payment wiring.

---

## Scope

| In scope (P17 domain) | Notes |
|------------------------|-------|
| Order creation from an ad (Buy Now path) | v1: manual confirmation — **not** payment capture |
| Checkout UX (address → shipping → **Order Summary Preview** → confirm) | See [P17-1-ux-spec.md](./P17-1-ux-spec.md) |
| Order entity, line items, shipping snapshot, status timeline | Future P17-2+ |
| Buyer “My orders” and seller “Orders to fulfill” surfaces | Future P17-4+ |
| Order-scoped notifications (with **P11** delivery, **P15** fan-out) | Future |
| Admin order visibility / dispute hooks (display only in **P8**) | Future — enforcement in **P7** |
| Saved delivery addresses (user-owned data; **P6** profile coordination) | Future |
| i18n namespace `p17.commerce.*` | Target from P17-1 onward |
| Idempotent order APIs and state machine | Future P17-3+ |

---

## Out of scope

| Item | Owner / reason |
|------|----------------|
| **Payment capture, card fields, Stripe/PayPal, webhooks, ledger, invoices** | **P10** — monetization & billing |
| Promoted ads, seller subscription plans, platform billing UI | **P10** |
| Auth, sessions, CSRF, login | **P2** — protected zone |
| Admin auth, 2FA, access system | **P8** / **P2** — protected zone |
| Chat thread creation semantics, WebSocket transport | **P5** — P17 may *link* to chat, not own it |
| Listing CRUD, ad images, ad moderation | **P4** |
| Fraud rules, blocks, RLS policy authoring | **P7** — P17 consumes enforcement |
| DB migrations, RLS, production data | Not until approved P17-2+ on STAGING |
| Production Buy Now CTA, `/checkout` routes | Not until P17-5 + Mohamed approval |
| DNS, SSL, VPS, Vercel rewrites | **P0** |
| Any implementation in **P17-0** | Docs only |

**Explicit rule:** “Confirm order” (`تأكيد الطلب`) in v1 is **not** “Pay now”. Payment integration, if ever added, is a **P10** milestone that **plugs into** P17 states — never merged into P17 ownership.

---

## P17 ownership boundaries

### P17 owns

- Order lifecycle semantics (state machine, transitions, SLA timers)
- Checkout and order UI/UX (when implemented)
- Order REST/WebSocket events (future `routes/orders.ts` or equivalent)
- Drizzle schema for orders, order_items, order_events (future, P17-2)
- OpenAPI entries for order endpoints (coordinate **P4** for spec hygiene)
- `p17.commerce.*` i18n keys

### P17 does not own

| Area | Owner |
|------|-------|
| Ad listing truth | **P4** |
| Buyer–seller messaging | **P5** |
| User profile / account settings shell | **P6** |
| Trust, disputes, blocks, RLS | **P7** |
| Admin panel framework, admin auth | **P8** |
| Payments, plans, promote-ad revenue | **P10** |
| Push / PWA delivery | **P11** |
| Order notification fan-out workers | **P15** |
| Horizontal scale, Redis, replicas | **P16** |

### P10 vs P17 (mandatory separation)

| Dimension | **P10 Monetization** | **P17 Commerce** |
|-----------|----------------------|------------------|
| Purpose | Platform revenue: promote ad, subscriptions, billing | Transaction structure: order from listing → fulfillment |
| Money movement | Payment provider, webhooks, ledger (future) | v1: **no** platform payment; price display only |
| User mental model | “Pay Souq for a service/plan” | “Place an order with a seller for an item” |
| Primary CTA (future) | Subscribe / promote / pay platform | Confirm order / track shipment |
| Admin UI | Billing, plans (`admin-billing`, `admin-plans`) | Order ops view (future, **P8** shell) |

**Integration point (future):** P10 may attach a `payment_status` or external payment reference to an P17 order **after** both domains are implemented — via explicit contract, not shared tables without migration council.

---

## Relation map (P6 / P7 / P8 / P11 / P15 / P16)

```
                    ┌─────────┐
                    │   P4    │  listing source (ad, price, seller)
                    └────┬────┘
                         │ ad_id
                         ▼
┌────────┐   address    ┌─────────────────────────────────────┐
│  P6    │─────────────▶│              P17                     │
│ profile│              │  checkout · order · fulfillment      │
└────────┘              └───────┬───────────────┬──────────────┘
                                │               │
              notify            │               │  dispute / block
                                ▼               ▼
                         ┌──────────┐     ┌──────────┐
                         │ P11+P15  │     │    P7    │
                         │ push/job │     │ trust/RLS│
                         └──────────┘     └────┬─────┘
                                               │
                         ┌──────────┐          │
                         │    P8    │◀─────────┘ admin order view
                         │  admin   │
                         └──────────┘

P5 ◀── optional “message seller” from order detail (link only)
P10 ── future payment reference only (no ownership overlap)
P16 ── scale path when order + notification volume requires queue/replicas
```

| P | Relationship to P17 |
|---|---------------------|
| **P6** | Saved addresses and buyer identity; P17 reads/writes delivery address **as order data** — profile UI stays P6 |
| **P7** | Blocks prevent order creation; reports/disputes on orders; RLS on order tables (P17 schema, P7 review) |
| **P8** | Admin surfaces for order search, manual intervention, SLA breaches — **UI shell** P8, **rules** P17 + P7 |
| **P11** | Push for “seller confirmed”, “shipped”, “delivered” — P17 emits events, P11 delivers |
| **P15** | Async: notification fan-out, reminder emails, SLA expiry jobs — mandatory before high order volume |
| **P16** | Order list queries, event writes, and notification spikes follow scale roadmap before PROD multi-replica |

**Also adjacent (not in required map):** **P4** (listing), **P5** (chat from order), **P2** (session for buyer/seller), **P13** (order funnel metrics).

---

## Future order state machine

**Status:** Design target for P17-3+ — **not implemented** in P17-0.

### States (v1 manual fulfillment)

| State | Buyer sees | Seller sees | Notes |
|-------|------------|-------------|-------|
| `checkout_draft` | Wizard in progress | — | Ephemeral; client or short TTL server draft |
| `pending_seller` | “Awaiting seller” | “Confirm order” | Created after **Order Summary Preview** confirm |
| `confirmed` | “Seller accepted” | “Prepare shipment” | Seller SLA clock starts |
| `preparing` | Timeline update | Pack / ready | Optional sub-state of confirmed |
| `shipped` | Tracking link | Mark shipped | Carrier + tracking snapshot immutable |
| `delivered` | Confirm receipt | Awaiting buyer confirm | Issue window opens |
| `completed` | Order history | Done | Terminal success |
| `cancelled` | Cancelled | Cancelled | Buyer (before ship) or seller / system |
| `disputed` | Issue open | Issue open | **P7** workflow; P17 holds order freeze flag |

### Allowed transitions (summary)

```
checkout_draft ──confirm──▶ pending_seller
pending_seller ──seller_confirm──▶ confirmed
pending_seller ──seller_reject / buyer_cancel / timeout──▶ cancelled
confirmed ──▶ preparing ──▶ shipped ──▶ delivered ──buyer_confirm──▶ completed
any (pre-shipped) ──dispute──▶ disputed  (P7)
```

### Invariants

- **Immutable snapshot** at confirm: product title, price, image URL, shipping method, address hash — copied from ad + checkout, not live-linked.
- **No payment state** in v1 machine — if P10 adds payment later, use parallel `payment_status` sub-state owned by P10.
- Transitions are **idempotent** and **append-only** in `order_events` (future table).
- Side effects (notify, chat system message) via **P15**, not synchronous API blocking.

---

## Future commerce roadmap summary

| Phase | Name | Deliverable | Runtime impact |
|-------|------|-------------|----------------|
| **P17-0** | Commerce charter | This doc + index + PROJECT_STATE | **None** |
| **P17-1** | UX spec & wireframes | [P17-1-ux-spec.md](./P17-1-ux-spec.md), `/dev/*` mocks only | Local/dev routes only |
| **P17-2** | Order domain specification | [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md) — model, state machine, integrations | **None** |
| **P17-3** | STAGING schema & internal model | Drizzle + `020_p17_orders_schema.sql` on **STAGING** only | STAGING DB |
| **P17-4** | Order API | CRUD + state transitions + OpenAPI regen | STAGING API |
| **P17-5** | Production UI ( gated ) | My orders, seller fulfillment, ad detail Buy Now | STAGING → approved PROD |
| **P17-6** | Seller order flow UI | `/seller-orders` accept/reject | STAGING → gated PROD |
| **P17-7+** | Hardening & scale | P15 jobs, P16 read patterns, dispute automation | Per P15/P16 gates |
| **P10 bridge** | Platform payment (optional, later) | Payment after confirm or escrow — **separate PR track** | P10 owns gateway |

**Execution gate:** No phase after P17-0 starts without Mohamed approval for STAGING/PROD-impacting work. P17-1 mock UI must stay under `/dev/*` until P17-5.

---

## P17 master roadmap (links)

| Doc / artifact | Phase | Status |
|----------------|-------|--------|
| [P17-commerce-orders.md](./P17-commerce-orders.md) (this file) | P17-0 | **Active — charter** |
| [P17-1-ux-spec.md](./P17-1-ux-spec.md) | P17-1 | UX architecture — mock only |
| [P17-1-i18n-draft.md](./P17-1-i18n-draft.md) | P17-1 | i18n draft keys |
| [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md) | P17-2 | **Order domain spec — no DB/API** |
| `lib/db/migrations/020_p17_orders_schema.sql` + `lib/db/src/schema/p17-orders.ts` | P17-3 | **STAGING schema applied** — 7 tables, relations, internal types; RLS deferred |
| [P17-4-navigation-contract.md](./P17-4-navigation-contract.md) | **P17-4-NAV** | **Closed** |
| [P17-4-api.md](./P17-4-api.md) | P17-4 | **Orders API — STAGING gated** |
| [P17-5-ui.md](./P17-5-ui.md) | P17-5 / P17-5-0 | **Closed** — buyer flow |
| [P17-6-ui.md](./P17-6-ui.md) | P17-6 / P17-6-0 | **Closed** — seller flow |
| [P17-7-shipping-workflow.md](./P17-7-shipping-workflow.md) | P17-7 / P17-7-0 | **Spec lock** — shipping workflow binding; implementation gated |
| P17-19-rollout.md | P17-19 | *PROD activation runbook — not created* |

Child specs must link back here for boundaries and must not duplicate P10 payment scope.

---

## Risks

| Risk | Mitigation |
|------|------------|
| P17 / P10 scope creep (payment in checkout) | Charter boundary + v1 CTA “confirm order” only; P10 owns all gateways |
| P2 / P8 accidental changes during order work | Protected zones — no auth/admin edits in P17 PRs without explicit approval |
| STAGING/PROD env mix on order migrations | **P1** guards; `MIGRATION_TARGET=staging` only until approved |
| Order + notification load on sync API | **P15** before high volume; state transitions enqueue side effects |
| Duplicate order from double-submit | Idempotency keys on create; unique constraint buyer+ad+draft window |
| Dispute/fraud without P7 | No P17-4 PROD without P7 review on RLS and report hooks |
| Skipping Order Summary Preview | P17-1 makes Step 3 mandatory — reduces buyer confusion and chargeback-like disputes |
| Legacy chat-only flow regression | Buy Now is additive; messaging remains **P5** default until flag rollout |

---

## Rollback notes

### P17-0 (this phase)

- **Rollback:** revert commits touching `docs/architecture/P17-commerce-orders.md`, `docs/architecture/README.md`, `docs/PROJECT_STATE.md` only.
- **Production impact:** none — documentation only.
- **Data impact:** none.

### Future phases (reference)

| Phase | Rollback lever |
|-------|----------------|
| P17-1 mocks | Remove `/dev/checkout-mock` routes; no DB |
| P17-3 STAGING schema | Drop 7 order tables on STAGING (`order_issues` → `orders` CASCADE); revert Drizzle schema files |
| P17-4 API | Tagged Docker rollback (**P0** `rollback-api.sh`); disable routes via feature flag |
| P17-5 PROD | Feature flag off → hide Buy Now; orders table retained (no destructive rollback without approval) |

---

## Testing requirements (P17-0)

| Check | P17-0 result |
|-------|----------------|
| Boundaries documented (P10 vs P17) | Required in this doc |
| No payment implementation | No code changes in P17-0 |
| No DB / API / PROD changes | Docs only |
| No P2 / P8 changes | Docs only |
| P17-1 spec links to this charter | Cross-link in P17-1 header (existing spec references P17) |

Per-phase test plans will be added in P17-2+ docs (STAGING scripts, API tests, i18n:check for `p17.commerce.*`).

---

## i18n namespace

**Target:** `p17.commerce.*` — draft keys in [P17-1-ux-spec.md](./P17-1-ux-spec.md). No new flat keys for commerce strings.

---

## Security notes

- Order PII (address) — RLS: buyer and seller and admin roles only (**P7** review on policies).
- No secrets in order payloads or docs (**CONSTITUTION §5**).
- CSRF on order mutations (**P2** — do not modify CSRF logic in P17 PRs).
- Rate limits on order create (**P7** / **P0** edge).

---

*P17-0 — Commerce Charter. Documentation only. Last updated: P17-0 closure.*

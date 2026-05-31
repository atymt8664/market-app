# P17-4 — Orders API Layer (STAGING)

| Field | Value |
|-------|-------|
| **Phase** | P17-4 |
| **Status** | Implemented — STAGING gated |
| **Navigation contract** | [P17-4-navigation-contract.md](./P17-4-navigation-contract.md) |
| **Domain spec** | [P17-2-order-domain-spec.md](./P17-2-order-domain-spec.md) |

---

## Activation (STAGING only)

| Variable | Required | Default | Effect |
|----------|----------|---------|--------|
| `P17_ORDERS_API_ENABLED` | STAGING DB API | `0` / unset | `1` → database provider |
| `DATABASE_URL` | Yes when enabled | — | Must reference STAGING ref for smoke |
| `P17_ORDERS_PRODUCTION_ALLOWED` | No | unset | Must stay unset until P17-19 |

When `P17_ORDERS_API_ENABLED` is off: GET endpoints return **mock** data (`mock: true`); mutations return **503**.

---

## Architecture

```
routes/orders.ts          → HTTP, auth, CSRF, provider switch
lib/p17/orders-service.ts → business rules, validation, mapping
lib/p17/orders-repository.ts → Drizzle DB access
lib/p17/order-state-machine.ts → allowed transitions (P17-4 scope)
lib/p17/orders-mock-provider.ts → PROD-safe fallback
lib/p17/orders-env-guard.ts → STAGING/PROD guard
```

---

## API inventory

| Method | Path | Auth | CSRF | Role | P17-4 |
|--------|------|------|------|------|-------|
| GET | `/api/orders` | session | — | buyer list | ✓ |
| GET | `/api/orders/seller` | session | — | seller list | ✓ |
| GET | `/api/orders/stats` | session | — | buyer stats | ✓ |
| GET | `/api/orders/status-summary` | session | — | compat zeros | ✓ |
| GET | `/api/orders/:orderNumber` | session | — | detail | ✓ |
| GET | `/api/orders/:orderNumber/timeline` | session | — | history | ✓ |
| GET | `/api/orders/:orderNumber/issues` | session | — | issues | ✓ |
| POST | `/api/orders` | session | ✓ | create | ✓ |
| POST | `/api/orders/:orderNumber/accept` | session | ✓ | seller | ✓ |
| POST | `/api/orders/:orderNumber/reject` | session | ✓ | seller | ✓ |
| POST | `/api/orders/:orderNumber/cancel` | session | ✓ | buyer/seller | ✓ |

**Path param:** `orderNumber` format `SOUQ-YYYY-NNNNNN` (P17-4-NAV). Legacy numeric id supported for internal lookup.

---

## Lifecycle (P17-4 implemented transitions)

| Action | From | To | Actor | Event |
|--------|------|-----|-------|-------|
| create | — | `pending_confirmation` | buyer | `order_submitted` |
| accept | `pending_confirmation` | `confirmed` | seller | `seller_confirmed_order` |
| reject | `pending_confirmation` | `cancelled` | seller | `seller_rejected_order` |
| cancel (buyer) | `pending_confirmation` | `cancelled` | buyer | `buyer_cancelled_order` |
| cancel (seller) | `pending_confirmation` | `cancelled` | seller | `seller_cancelled_order` |

**Note:** Seller «reject» maps to canonical status `cancelled` (not a separate `rejected` enum). `issue_open` is `issue_flag` overlay — P17-11.

Deferred to P17-5+ : `preparing`, `shipped`, `delivered`, `completed`.

---

## POST /api/orders — Create

**Headers:** `Idempotency-Key` (optional, recommended)

**Body:**

```json
{
  "adId": 123,
  "fulfillmentMode": "shipping",
  "currency": "EUR",
  "shippingAmount": "5.00",
  "shippingMethodLabel": "DHL Paket",
  "buyerAddress": {
    "city": "Leipzig",
    "countryCode": "DE",
    "line1": "Example Str. 1",
    "postalCode": "04109"
  }
}
```

**Rules:** ad approved · fixed price · buyer ≠ seller · no duplicate active order · shipping requires address.

**Response:** `201` `{ order, mock: false }`

---

## Security (application layer — P17-4)

| Check | Implementation |
|-------|----------------|
| Authentication | `requireAuth` — session user |
| Mutations CSRF | `requireUserCsrf` |
| Buyer list/detail | `buyer_user_id = session.userId` |
| Seller list/detail/actions | `seller_user_id = session.userId` |
| Party detail/timeline/issues | buyer OR seller |
| Optimistic lock | `version` column on transitions |
| Idempotency | unique `idempotency_key` |
| STAGING guard | `orders-env-guard.ts` |

**RLS:** Not enabled on order tables in P17-3. **P17-13** adds Supabase RLS policies. P17-4 relies on API ownership checks only.

---

## Response contract

All list/detail responses include `mock: boolean`. Database responses use `mock: false`. List item `id` equals `orderNumber` for deep links.

---

## Validation

```bash
cd artifacts/api-server
pnpm run typecheck
pnpm run test
pnpm run p17-4:validate
pnpm run build
```

STAGING smoke (requires session cookie + STAGING env): manual or future `p17-4:staging-smoke` script.

---

## Rollback

1. Set `P17_ORDERS_API_ENABLED=0` → instant fallback to mock GET; mutations 503.
2. Revert API deploy tag via `rollback-api.sh` (P0).
3. No destructive schema rollback — order tables retained.

---

## Out of scope (P17-4)

- UI wiring (P17-5+)
- Buy Now / checkout routes
- Notifications, chat banner, support order category
- Admin orders
- RLS SQL
- PROD activation

---

*P17-4 Orders API — STAGING gated. Last updated: P17-4 implementation.*

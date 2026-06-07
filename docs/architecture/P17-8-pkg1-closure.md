# P17-8 Package 1 — Order Tracking Track Closure

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Sub-phase** | **P17-8 Package 1** — `OrderTrackingTrack` foundation + Live Progress Timeline |
| **Parent spec** | [P17-8-0-tracking-timeline-ux-lock.md](./P17-8-0-tracking-timeline-ux-lock.md) |
| **Status** | **Closed — Mohamed Visual APPROVED 2026-06-07** |
| **Runtime** | Frontend only — `artifacts/souq` · no API/DB change in Package 1 |

---

## 1. Visual approval (Mohamed — 2026-06-07)

| Item | Result |
|------|--------|
| RTL direction | **APPROVED** — تم الطلب يمينًا → تم التسليم يسارًا |
| Live progress | **APPROVED** — lime pulse travels from current node toward next |
| Motion intensity | **APPROVED** — light, non-intrusive |
| Mobile layout | **APPROVED** — 320–390px |
| Visual identity | **APPROVED** — Dark Premium `#0A0A0A` + Lime accent + card UI |

**Canonical shape (frozen for Package 1):**

```
●━━━━●━━━━◉━━━━[pulse→]━━━━○━━━━○━━━━○
```

---

## 2. Package 1 scope delivered

| In scope (delivered) | Out of scope (deferred) |
|----------------------|-------------------------|
| `OrderTrackingTrack` component | Package 2+ features |
| 6-node shipping / 4-node pickup mapping | ETA, carrier logos, webhooks |
| Continuous journey rail + travel pulse | Notifications (P17-9) |
| RTL grid, equal columns, mobile-first | Chat (P5), Cart (P17-CART) |
| `p17-8:pkg1:validate` + smoke scripts | State machine / API changes |
| `prefers-reduced-motion` guard | Production deploy (separate task) |

**Key implementation files:**

- `artifacts/souq/src/features/p17-commerce/order-tracking-track.tsx`
- `artifacts/souq/src/features/p17-commerce/order-tracking-track-mapping.ts`
- `artifacts/souq/src/features/p17-commerce/order-tracking-track.css`
- `artifacts/souq/scripts/validate-p17-8-pkg1.mjs`

**Initial commit (foundation):** `593d2b2` — subsequent visual polish commits may be local until next agreed deploy.

---

## 3. Validation record

| Check | Result |
|-------|--------|
| `p17-8:pkg1:validate` | PASS |
| `typecheck` / `build` / `i18n:check` | PASS |
| Playwright smoke | PASS |
| RTL position check 320 / 360 / 390 | PASS |
| Mohamed mobile visual review | **APPROVED** |

---

## 4. Future SLA requirement (record only — **not implemented**)

Recorded per Mohamed direction during Package 1 closure. **Does not open a new phase.** Implementation deferred to **P17-2 §6** + **P15** workers (existing roadmap).

| # | Requirement | Owner (future) |
|---|-------------|----------------|
| F1 | After order creation, seller has a **confirmation deadline** (e.g. 24–48h) | P17 domain + P15 job |
| F2 | If seller does not confirm in time → order **expired/cancelled** (seller non-response) | P17 state machine + P15 |
| F3 | After confirmation, seller has a **shipping/prepare deadline** | P17-2 §6 |
| F4 | If shipping delayed → **delay/alert state** (not silent) | P17 timeline + P17-9 notifications (future) |
| F5 | Seller manual status updates: confirmed → preparing → shipped → in transit | P17-7 / existing seller flow |
| F6 | Buyer confirms **delivered** only | P17 buyer flow (future API) |

**Cross-reference:** [P17-2-order-domain-spec.md §6](./P17-2-order-domain-spec.md#6-sla-rules-spec-only--p15-implements-later)

---

## 5. Definition of Done — Package 1

- [x] P17-8-0 spec lock closed
- [x] `OrderTrackingTrack` wired in order detail (buyer + seller compact)
- [x] Live progress pulse on active segment
- [x] Automated validation PASS
- [x] Mohamed visual approval
- [x] PROJECT_STATE updated
- [ ] Package 2 — **not opened**

---

*P17-8 Package 1 closed. Package 2 awaits explicit task.*

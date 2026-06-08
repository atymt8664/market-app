# P17-8 Package 2 — Tracking Enrichment Closure

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Sub-phase** | **P17-8 Package 2** — ETA · events · details · carrier readiness |
| **Parent spec** | [P17-8-0-tracking-timeline-ux-lock.md](./P17-8-0-tracking-timeline-ux-lock.md) |
| **Status** | **Closed — Mohamed Visual APPROVED** |
| **Runtime** | Frontend only — `artifacts/souq` · no carrier APIs · no SLA |

---

## 1. Visual approval (Mohamed)

| Item | Result |
|------|--------|
| Last Updated row | **APPROVED** |
| Date chips (≤3) | **APPROVED** |
| Shipment Events | **APPROVED** |
| Tracking Details + copy | **APPROVED** |
| Carrier readiness (static URLs only) | **APPROVED** |
| Package 1 rail + pulse preserved | **APPROVED** |

---

## 2. Scope delivered

| In scope | Out of scope |
|----------|--------------|
| ETA banner (`etaAt` when present) | Package 3+ |
| Last updated + date chips | P17-9 notifications |
| Shipment events from timeline API | Real carrier APIs (P17-17) |
| Tracking details + copy + static carrier link | SLA enforcement |
| [Carrier readiness architecture](./P17-8-pkg2-carrier-readiness.md) | P17-CART · P5 Chat |

---

## 3. Validation

| Check | Result |
|-------|--------|
| `p17-8:pkg2:validate` | PASS |
| `p17-8:pkg1:validate` | PASS |
| `typecheck` / `build` / `i18n:check` | PASS |
| Production bundle verification | See PROJECT_STATE deploy ref |

---

*P17-8 Package 2 closed. Package 3 not opened.*

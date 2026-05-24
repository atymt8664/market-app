# P10 — Monetization & Billing

| Field | Value |
|-------|-------|
| **Code** | P10 |
| **Status** | **Partial** — UI without live platform payments |

---

## الهدف / Goal

**Revenue features**: promote ad, professional seller, subscription plans, and future payment integration — without blocking core marketplace free usage.

---

## المسؤوليات / Responsibilities

- Promote-ad flows and previews
- Professional seller page
- Admin billing and plans pages (configuration UI)
- Future: payment provider webhooks, ledger, invoices

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| Pages | `promote-ad.tsx`, `promote-preview.tsx`, `professional-seller.tsx`, `admin-billing.tsx`, `admin-plans.tsx` |
| Components | `promote-ad-marketing-body.tsx`, `create-ad-promotion-teaser.tsx` |
| i18n | `pro_seller_page.*`, promote keys (target: `p10.monetization.*`) |

---

## ما المسموح تعديله / Allowed changes

- Pricing UI, plan copy, feature flags for paid tiers
- Admin plan configuration (no charges until gateway approved)

---

## ما الممنوع تعديله / Forbidden changes

- Enabling Stripe/PayPal without **P1** prod approval + **P7** fraud review
- Coupling payments into **P5** chat or **P4** core CRUD

---

## Boundaries

- Hooks into **P4** for “featured” flags only — payments isolated when added

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P4** | Promoted ads |
| **P8** | Admin billing |
| **P2** | Seller account |
| **P13** | Revenue metrics (future) |
| **P15** | Webhook workers (future) |

---

## Owner scope

- **Primary:** Monetization squad

---

## Scalability notes

- Payment webhooks must be idempotent — **P15** queue
- Separate ledger DB considered at high volume

---

## Future roadmap

- Stripe EU integration
- Seller subscriptions
- `p10.monetization.*` i18n (remove “phase” copy in locales)

---

## Testing requirements

- UI flows on STAGING without real charges
- No production payment keys in repo

---

## Security notes

- PCI scope minimization — use provider hosted checkout when implemented
- Webhook signature verification

---

## Related legacy phase paths

None in infra. i18n strings referencing “phase” for “payments not enabled” → migrate to `p10.monetization.*`.

---

## i18n namespace

**Target:** `p10.monetization.*`

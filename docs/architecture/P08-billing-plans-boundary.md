# P8-1G — Billing, Plans, Verification & Trust Boundaries

**Status:** Closed (2026-05-31)  
**Owner (revenue):** [P10-monetization.md](./P10-monetization.md)  
**Code registry:** `artifacts/souq/src/lib/monetization-boundary.ts`

---

## Purpose

Document what is **live**, **placeholder (preview architecture)**, or **future (P10+)** for monetization-adjacent surfaces — so staff and users are not misled about payments, subscriptions, earnings, or trust scores.

**Out of scope for P8-1G:** Enabling Stripe/PayPal, real subscriptions, ledger, or trust-score computation.

---

## Boundary matrix

| Surface | Route / UI | API | State | Owner | UI marker |
|---------|------------|-----|-------|-------|-----------|
| Admin billing | `/admin/billing` | None | Placeholder | **P10** | `data-p10-preview="admin.billing"` |
| Admin plans | `/admin/plans` | None | Placeholder (indicative €) | **P10** | `data-p10-preview="admin.plans"` |
| Admin verification ops | `/admin/verification` | `GET/POST/PATCH /api/admin/verification/*` | **Live staff queue** | **P8** | `data-p10-preview="admin.verification_ops"` + `data-p8-verification-ops="true"` |
| User verification intake | `/account/verification` | None (no public submit) | Preview | **P10 / P8** | `data-p10-preview="user.verification_preview"` |
| Promote ad checkout | `/promote/:id` | None | Preview (disabled pay) | **P10** | `data-p10-preview="user.promote"` |
| Promote demo | `/promote-preview` | None | Preview | **P10** | `data-p10-preview="user.promote_preview"` |
| Account payments | `/account/payments` | None | Preview | **P10** | `data-p10-preview="user.payments"` |
| Professional seller / plans | `/professional-seller/*` | None | Preview | **P10** | `data-p10-preview="user.pro_seller"` or `user.trust_score` |
| Seller trust explainer | `/seller-trust` | None | Preview (`— /100`) | **P10** | `data-p10-preview="user.trust_score"` |
| Trust score API | — | **Not implemented** | Future | **P10 / P7** | — |
| Email verify (auth) | `/verify-email` | `/api/auth/*` | **Live** (distinct from identity queue) | **P2** | — |

---

## Verification split (critical)

| Layer | Status | Notes |
|-------|--------|-------|
| **Admin queue** | Live | Staff claim/assign/approve/reject; `verification_requests` table |
| **User submit** | Not enabled | No public POST/upload; `/account/verification` is preview-only |
| **Trust score** | Not computed | Admin plans page + seller trust UI show architecture copy only |

Staff must not assume end-to-end user funnel is live because the admin queue works.

---

## Billing & plans (P10 defer)

- No `GET/POST /api/admin/billing*` or `/api/admin/plans*`.
- Admin UI shows disconnected state, disabled filters, em-dash channel values — **no fake revenue counters**.
- Euro prices on admin plans and promote UI are **design placeholders** (`label_estimated`, preview banners).
- RBAC: `finance_manager` + founder see billing/plans nav; enforcement unchanged.

---

## Guards (P8-1G)

1. **`MonetizationPreviewBanner`** — shared amber banner (`p10.monetization.boundary.preview_banner`) on promote marketing body.
2. **`p10PreviewAttrs(surface)`** — `data-p10-preview` on all boundary surfaces (validate script).
3. **Admin billing** — renders `p8.admin.billing.alert` + filter hint; no API calls.
4. **Admin verification** — sky boundary note (`p8.admin.verification.boundary_user_submit`).
5. **No payment provider keys** in repo; no webhook routes.

---

## Validation

| Script | Purpose |
|--------|---------|
| `pnpm run p8-1g:validate` | Registry, UI markers, i18n keys, no billing API refs in souq |
| `pnpm run p8-1g:prod` | Production bundle contains boundary markers |

---

## Related docs

- [P08-admin-baseline.md](./P08-admin-baseline.md) — route inventory  
- [P10-monetization.md](./P10-monetization.md) — revenue owner  
- [P17-commerce-orders.md](./P17-commerce-orders.md) — orders vs platform billing boundary

# Souq Arab EU — Project State

**Authority:** Operational phase tracker. Engineering rules: [architecture/CONSTITUTION.md](./architecture/CONSTITUTION.md).

**EDP:** Final Reports, Audits, Handover Reports, and Architecture Reviews MUST end with [Phase Continuity Lock](./architecture/CONSTITUTION.md#184-phase-continuity-lock--mandatory-template). Update this file before filling PCL in any handoff. New session: [Session Entry Point](./architecture/CONSTITUTION.md#183-session-entry-point) — read PROJECT_STATE → last PCL → PCL §6 only.

**Stack (official):** Vercel (frontend) · Hetzner VPS (API) · Supabase Pro (DB + storage) · WebSocket · Railway = legacy/fallback only.

**Environment refs (never mix):**

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## Architecture map (adopted — docs only)

| Item | Value |
|------|-------|
| **Builder P-domains** | **P0 → P17 only** ([README](./architecture/README.md)) |
| **Expansion** | **Sub-Phases** (e.g. `P17-7A`, `P9-A-0`) inside a builder P · **Annexes** ([annex/](./architecture/annex/README.md)) — not new P numbers |
| **Not adopted** | P18–P25 as builder domains |
| **New features** | [CONSTITUTION A11 + Feature Admission Flow](./architecture/CONSTITUTION.md#11-feature-admission-flow) |

---

## Execution order (current wave)

Only **one open builder phase** at a time. Sequence:

```
✅ P13-1 → … → ✅ P17-7 → ✅ P17-7A → ✅ P17-8-0 → ✅ P17-8 Package 1 → P17-8 Package 2+ … P17-19
```

**P17-5/6/7/7A** buyer · seller · shipping · address gate **live on PRODUCTION** (API `souq-api:p17-7a-prod-20260607` · Vercel `dpl_467hoSjz7zqVCPeqJkQoykkyHrxw`). **P17-8 Package 1** closed (Mohamed visual APPROVED 2026-06-07) · **P17-8 Package 2+** not opened.

### P9-A — Home Stability Lock (Phase A)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P9-A-0** Stability contract + baseline + guards | ✅ **Closed** | [P09-home-stability-contract.md](./architecture/P09-home-stability-contract.md) · [baseline](./architecture/P09-home-stability-baseline.md) · [checklist](./runbooks/P9-A-home-stability-checklist.md) · [regression guards](./runbooks/P9-A-home-regression-guards.md) · `p9-a:validate` + `test:home-stability` · **no production behavior change** |

### P9-B — Observability & Regression Guards (Phase B)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P9-B-0** Observability layer + CI guards + monitoring baseline | ✅ **Closed** | [P09-B-home-observability.md](./architecture/P09-B-home-observability.md) · [monitoring baseline](./architecture/P09-B-home-monitoring-baseline.md) · [guard system](./runbooks/P9-B-home-regression-guard-system.md) · [CI strategy](./runbooks/P9-B-ci-validation-strategy.md) · `p9-b:guards` in CI · **no production behavior change** |

### P9-C — Rendering Simplification (Phase C)

| Milestone | Status | Notes |
|-----------|--------|-------|
### P9-D — Image & Feed Performance (Phase D)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P9-D-0** LCP image sizing + delivery path | ✅ **Closed — Production verified** | `featuredLead` transform (350×262 @2x) · deploy `dpl_9vD5HcUMB77wZHtP8w69wENVSYfT` · PSI LCP 4.9s→4.2s · guards PASS · **UX unchanged** |

**P9-A/B/C/D** lock Home post P7 Featured Stability Fix. No Phase E until explicit sign-off after P9-D.

---

## Phase status

### P13 — Analytics & Observability

| Milestone | Status | Notes |
|-----------|--------|-------|
| P13-1 Google Search Console | ✅ Closed | |
| P13-2 Visual identity `#0A0A0A` | ✅ Closed | |
| P13-3 Index Monitoring + CWV | ✅ Closed | |
| **P13-4** AI Discoverability + KG | ✅ Closed | Commits `056c0a4`, `b5eb690` · Vercel `4876522809` |
| P13-4-A Bing Webmaster | ✅ Closed (automated) | `bing:p13:prod` PASS · manual BWT per runbook |

### P8 — Admin panel (P8-1 wave)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P8-1A** Baseline & doc sync | ✅ **Closed** | Baseline: `docs/architecture/P08-admin-baseline.md` · Smoke: `docs/runbooks/P8-1A-staging-admin-smoke.md` |
| **P8-1B** Settings PATCH UI | ✅ **Closed** | `/admin/settings` editor wired to `PATCH /api/admin/settings` |
| **P8-1C** User center polish | ✅ **Closed** | `last_seen_at` in users list · NOC↔users deep links · `status=unverified` filter |
| **P8-1D** Audit & logs maturity | ✅ **Closed** | Commit `9cc503c` · VPS `souq-api:p8-1d-20260531` · phase8 external PASS · Vercel `admin-logs-DCCeHcWo.js` |
| **P8-1E** i18n closure | ✅ **Closed** | Commit `9b20675` · Vercel `admin-settings-CHr9B3tj.js` · `i18n:check` ar/en/de PASS |
| **P8-1F** Dashboard contracts | ✅ **Closed** | Commits `082065b`, `935224b`, `09dcada` · VPS `souq-api:p8-1f-20260531` · Vercel `dpl_3BKsJpnSkYF2kr1grhQY7cauWqqC` · `p8-1f:prod` PASS |
| **P8-1G** Billing/plans boundary | ✅ **Closed** | Commit `9e84a30` · Vercel `dpl_F3PCDapsv6CLG2xfjxN8puEQbaM4` · `p8-1g:validate` PASS |
| **P8-1H** Monitoring boundary + NOC CPU hook | ✅ **Closed** | Commits `9303bda`, `3a8b05c` · Vercel `fra1::mvmjx-1780200854600-a121d2f32ea0` · VPS `souq-api:p8-1h-20260531` · `p8-1h:validate` + `p8-1h:prod` + post-deploy smoke PASS |
| **P8-1I** Final admin verify + P8-1 close | ✅ **Closed** | Commits `dcff3e0`, `d0d376c`, `0208ad7` · VPS prod-shadow `souq-api:p8-1h-20260531` · `p8-1i:prod` + env isolation audit PASS |
| **P8-1** (parent) | ✅ **Closed** | All sub-milestones P8-1A…P8-1I complete |

### P15 — Background jobs & workers

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P15-1A** Architecture docs + ADRs | ✅ **Closed** | Commit `a7b8c67` · Authority: `docs/architecture/P15-background-jobs.md` · Phase 1: pg-boss · Phase 2: BullMQ+Redis on trigger metrics only |
| **P15-1** (parent — architecture wave) | ✅ **Closed** | Documentation only — no code/migrations/deploy |
| **P15-2** Queue foundation (STAGING) | ✅ **Closed** | Commit `f42bf2a` · pg-boss foundation on STAGING ref only — queue module, worker bootstrap, registry, retry/DLQ/observability; foundation jobs `system.ping` / `system.dlq_probe`; STAGING smoke PASS; no business-logic migration |
| **P15-3C** Push delivery outbox | ✅ **Closed** | Commit `0c31789` · STAGING `PUSH_OUTBOX_ENABLED` |
| **P15-3D** Media / image jobs analysis | ✅ **Closed** | Analysis-only — defer worker wiring |
| **P15-3E** Cron / operations jobs | ✅ **Closed** | STAGING `ops.sla_escalate` cron; admin-read anti-pattern fixed |
| **P15-3F** Analytics rollups | ✅ **Closed** | STAGING `analytics.daily` + rollup store |
| **P15-3G** Account deletion storage purge | ✅ **Closed** | STAGING `media.purge` outbox; verification docs in path collection |
| **P15-3** Hot path migration | ✅ **Closed** | P15-3A–3G complete |
| P15-4 Production hardening | ✅ **Closed** | pg-boss monitoring fix, DLQ replay foundation, worker ops runbook |

### P17 — Commerce, orders & fulfillment

| Milestone | Status | Notes |
|-----------|--------|-------|
| P17-0 Charter | ✅ Closed | [P17-commerce-orders.md](./architecture/P17-commerce-orders.md) |
| P17-1 UX spec + mocks | ✅ Closed | [P17-1-ux-spec.md](./architecture/P17-1-ux-spec.md) |
| P17-1B Coming Soon exposure | ✅ Closed | Ad Detail placeholders |
| P17-2 Order domain spec | ✅ Closed | [P17-2-order-domain-spec.md](./architecture/P17-2-order-domain-spec.md) |
| P17-3 STAGING schema | ✅ Closed | `020_p17_orders_schema.sql` |
| **P17-4-NAV** Navigation contract | ✅ Closed | [P17-4-navigation-contract.md](./architecture/P17-4-navigation-contract.md) |
| **P17-4** Orders API layer | ✅ Closed (code) | [P17-4-api.md](./architecture/P17-4-api.md) — STAGING gated · `P17_ORDERS_API_ENABLED=1` |
| **P17-4A** Orders contract + STAGING smoke | ✅ **Closed** | `p17-4:validate` PASS · `p17-4a:staging-smoke` in-process + HTTP PASS (STAGING ref) · `id === orderNumber` · SOUQ-YYYY-NNNNNN · mock IDs removed · `/orders/test` removed from prod UX · minimal read-only detail wiring |
| **P17-5-0** Buyer flow spec lock | ✅ **Closed** | [P17-5-ui.md](./architecture/P17-5-ui.md) — documentation only |
| **P17-5** Buyer order flow | ✅ **Closed** | [P17-5-ui.md](./architecture/P17-5-ui.md) · STAGING verified · **no commit/deploy** until Mohamed approval |
| **P17-6-0** Seller flow spec lock | ✅ **Closed** | [P17-6-ui.md](./architecture/P17-6-ui.md) · `p17-6-0-seller-security-verify` PASS |
| **P17-6** Seller order flow UI | ✅ **Closed** | P17-6-1 · `VITE_P17_SELLER_ORDERS_ENABLED` · STAGING verified |
| **P17-7-0** Shipping workflow spec lock | ✅ **Closed** | [P17-7-shipping-workflow.md](./architecture/P17-7-shipping-workflow.md) |
| **P17-7** Shipping workflow | ✅ **Closed** | STAGING `p17-7:staging-flow` PASS · PROD API: P17-PROD-2 · PROD frontend: **P17-PROD-3** |
| **P17-7A-0** Order address + seller confirm + chat spec lock | ✅ **Closed** | [P17-7A-order-address-seller-chat-spec.md](./architecture/P17-7A-order-address-seller-chat-spec.md) · Closure Review PASS · Mohamed sign-off **APPROVED** 2026-06-07 · documentation only — no runtime |
| **P17-7A** Order address + seller confirm + chat implementation | ✅ **Closed** | Commit `4036953` · STAGING `souq-api:p17-7a-staging-20260607` · PROD API `souq-api:p17-7a-prod-20260607` · Vercel `dpl_467hoSjz7zqVCPeqJkQoykkyHrxw` · `p17-7:staging-flow` + prod route smoke PASS · D9 approved 2026-06-07 |
| **P17-PROD-1** Production orders foundation | ✅ **Closed** | `020_p17_orders_schema.sql` on PRODUCTION · 7/7 tables OK |
| **P17-PROD-2** Production API deployment | ✅ **Closed** | `souq-api:p17-prod-2-20260601` · `P17_ORDERS_API_ENABLED=1` · API smoke PASS |
| **P17-PROD-3** Official frontend production activation | ⚠️ **Integrity issue** | Vercel flags OK · E2E pollution discovered in P17-PROD-FIX-1 |
| **P17-PROD-FIX-1** Production integrity recovery | ✅ **Closed** | Removed P17-PROD-2 E2E rows (4 users, 4 ads, 6 orders) · checkout CSRF fix pending deploy |
| **P17-8-0** Tracking timeline UX / motion / architecture lock | ✅ **Closed** | [P17-8-0-tracking-timeline-ux-lock.md](./architecture/P17-8-0-tracking-timeline-ux-lock.md) · Mohamed sign-off **APPROVED** 2026-06-07 · mobile canonical track `●━━━━●━━━━◉━━━━○━━━━○━━━━○` · documentation only |
| **P17-8 Package 1** Order tracking track + live progress timeline | ✅ **Closed** | [P17-8-pkg1-closure.md](./architecture/P17-8-pkg1-closure.md) · `OrderTrackingTrack` · continuous rail + travel pulse · Mohamed visual **APPROVED** 2026-06-07 · `p17-8:pkg1:validate` PASS · commit `593d2b2` + local polish |
| **P17-8 Package 2+** Tracking timeline (ETA, carriers, events, …) | ⏳ **Next (not opened)** | Await explicit task; Package 1 closed — no scope creep |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

P17-8 Package 1 closed (Mohamed visual APPROVED 2026-06-07). Open builder: **none** — next candidate **P17-8 Package 2+** (not opened). Future Order SLA note recorded in P17-2 §6.1 (no implementation). P9-E not opened.

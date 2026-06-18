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
| **ADRs** | [architecture/adr/](./architecture/adr/README.md) — [ADR-000](./architecture/adr/000-approved-platform-stack.md) approved stack · [ADR-006](./architecture/adr/006-git-only-production-frontend-deploy.md) Git-only frontend deploy (**Accepted** 2026-06-18) |

---

## Execution order (current wave)

Only **one open builder phase** at a time. Sequence:

```
✅ P13-1 → … → ✅ P17-8 Package 2 → ✅ P17-PRELAUNCH-1 → ✅ P17-PRELAUNCH-2 → **P9 Pre-Launch Wave (P9-1…P9-13)** → P5-PRELAUNCH → P11-PRELAUNCH → P0-LAUNCH-GATE
```

**P17-5/6/7/7A** buyer · seller · shipping · address gate **live on PRODUCTION** (API `souq-api:p17-7a-prod-20260607`). **P17-8 Package 1** closed (`2c96aa1` · `dpl_7wKgH4VJHWypCVTubcNKrdbo2cTU`). **P17-8 Package 2** closed + **prod verified** (commit `bb6070a` · Vercel `dpl_8TNVeqkxcELqQoXxcEUsWyEN3BWU` · Mohamed visual APPROVED) · **P17-8 Package 3+** not opened.

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
| **P9-C-0** Rendering simplification wave | ✅ **Closed** | Per P9-C charter — Home stability preserved |

### P9-D — Image & Feed Performance (Phase D)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P9-D-0** LCP image sizing + delivery path | ✅ **Closed — Production verified** | `featuredLead` transform (350×262 @2x) · deploy `dpl_9vD5HcUMB77wZHtP8w69wENVSYfT` · PSI LCP 4.9s→4.2s · guards PASS · **UX unchanged** |

**P9-A/B/C/D** lock Home post P7 Featured Stability Fix. No Phase E until explicit sign-off after P9-D.

### P9 Pre-Launch Execution Wave

**Coverage lock:** PRE-LAUNCH audit + P9-AUDIT-COVERAGE-LOCK + P9-COVERAGE-COMPLETION (2026-06-14).

| Phase | Scope | Status | Notes |
|-------|-------|--------|-------|
| **P9-1** | Location Picker i18n | ✅ **Closed — Production verified** | Commit `4cc3795` · gate picker keys + `ensureFullLocaleForInteraction` on open · `p9-1-location-picker-i18n-verify` PASS prod (10/10 · refresh×10 · open/close×10) |
| **P9-2** | Language Gate isolation | ✅ **Closed — Production verified** | Commit `838f9ba` · strip shell on first launch · gate full-screen z-100 · skip Home warm path · `p9-2-language-gate-isolation-verify` PASS prod (6/6 · refresh×10 · clear storage) |
| **P9-3** | Cold Start Contract · App Shell | ⏳ **Next** | **Architecture SSOT:** [P09-3-App-Shell-Contract.md](./architecture/P09-3-App-Shell-Contract.md) · docs committed · **implementation not started** — pending Mohamed approval |
| **P9-4** | CI Guards | ⏳ Not opened | |
| **P9-5** | Real Device Matrix | ⏳ Not opened | Mohamed checklist |
| **P9-6** | PWA / A2HS Stability | ⏳ Not opened | |
| **P9-7** | Full Interaction Flows | ⏳ Not opened | |
| **P9-8** | Network Resilience | ⏳ Not opened | |
| **P9-9** | Arabic Overlay Sweep | ⏳ Not opened | |
| **P9-10** | UX Stability Hardening | ⏳ Not opened | |
| **P9-11** | Scale Readiness | ⏳ Not opened | |
| **P9-12** | Push Notifications Closure | ⏳ Not opened | P17-9-13 device matrix |
| **P9-13** | Pre-Promotion Gate | ⏳ Not opened | After P9-2…P9-12 |

**Sequence after P9-13 closes:** `P5-PRELAUNCH → P11-PRELAUNCH → P0-LAUNCH-GATE`.

**Owner manual PASS (do not re-audit unless regression):** Signup · Login · OTP · Forgot Password · Reset Password on Production.

**Next implementation milestone:** **P9-3 — Cold Start Contract** only — gated on approval of [P09-3-App-Shell-Contract.md](./architecture/P09-3-App-Shell-Contract.md).

### P9-3 — App Shell architecture (documentation)

| Milestone | Status | Notes |
|-----------|--------|-------|
| **P9-3-ARCH-0** App Shell Contract (SSOT) | ✅ **Closed — docs only** | [P09-3-App-Shell-Contract.md](./architecture/P09-3-App-Shell-Contract.md) · App Shell · Header · Bottom Nav · Safe Area · Language Gate · Cold Start · Layout Stability · tab routes · **no production code change** |
| **P9-3-IMPL** Implementation wave | ⏳ **Not started** | Awaiting explicit Mohamed approval of contract |

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
| **P17-PROD-FIX-1** Production integrity recovery | ✅ **Closed** | Removed P17-PROD-2 E2E rows (4 users, 4 ads, 6 orders) · checkout CSRF fix **deployed** (P17-PRELAUNCH-1) |
| **P17-PRELAUNCH-1** Integrity & stability gate | ✅ **Closed — Production verified** | Vercel `dpl_8jnjZYKZg5gvW421j3fwu9pCHrpq` · `p17-prelaunch-1-prod-verify` PASS · API unchanged `souq-api:p17-7a-prod-20260607` |
| **P17-8-0** Tracking timeline UX / motion / architecture lock | ✅ **Closed** | [P17-8-0-tracking-timeline-ux-lock.md](./architecture/P17-8-0-tracking-timeline-ux-lock.md) · Mohamed sign-off **APPROVED** 2026-06-07 · mobile canonical track `●━━━━●━━━━◉━━━━○━━━━○━━━━○` · documentation only |
| **P17-8 Package 1** Order tracking track + live progress timeline | ✅ **Closed — Production verified** | [P17-8-pkg1-closure.md](./architecture/P17-8-pkg1-closure.md) · journey rail + travel pulse · commit `2c96aa1` · Vercel `dpl_7wKgH4VJHWypCVTubcNKrdbo2cTU` |
| **P17-8 Package 2** Tracking enrichment (ETA · events · details · carrier readiness) | ✅ **Closed — Production verified** | [P17-8-pkg2-closure.md](./architecture/P17-8-pkg2-closure.md) · last updated · date chips · shipment events · tracking details · static carrier URLs · Mohamed visual **APPROVED** · commit `bb6070a` · Vercel `dpl_8TNVeqkxcELqQoXxcEUsWyEN3BWU` · `p17-8:pkg2:validate` PASS |
| **P17-8 Package 3+** Tracking timeline (extended features) | ⏳ **Not opened** | Deferred — pre-launch polish sequence active |
| **P17-PRELAUNCH-2** Commerce surfaces polish | ✅ **Closed — Production verified** | Order list thumbnails · bottom nav flush · orders refresh · commit `d980862` · Vercel `index-CARgRcHP.js` · prod visual account `atymt8664@gmail.com` (6 orders) · `p17-prelaunch-2-prod-close` PASS |
| **P17-9-0** Notification Architecture Lock | ✅ **Closed** | Reference + Addendum A + B + C-STACK — docs only · Mohamed approved |
| **P17-9-0A** ADR Framework | ✅ **Closed** | [adr/README.md](./architecture/adr/README.md) · [ADR-000](./architecture/adr/000-approved-platform-stack.md) · governance docs only — **no notification code** |
| **P17-9-1** Notification Foundation | ✅ **Closed** | `artifacts/api-server/src/lib/notifications/` — catalog · dedup · aggregation · deep-link · foundation resolver · prepare pipeline wiring · `p17-9-1:validate` PASS · **no DB/UI/push/realtime changes** |
| **P17-9-2** Notification DB + Contracts + Idempotency Schema | ✅ **Closed** | Migration `023_p17_9_2_notification_idempotency.sql` · drizzle schema · contract + idempotent persist + outbox dedup key · `p17-9-2:validate` PASS · **no realtime/push/UI/deploy** |
| **P17-9-3** Realtime Notifications | ✅ **Closed** | `notification.created` WS event · persist broadcast · `NotificationRealtimeSync` query invalidation · `p17-9-3:validate` PASS · **no push/UI/counters/deploy** |
| **P17-9-4** Push Infrastructure | ✅ **Closed** | payload contract v1 · dedup idempotency · WS-connected skip · SW dedup tag · `p17-9-4:validate` PASS · **no counters/UI/deploy** |
| **P17-9-5** Counters + Badges | ✅ **Closed** | `GET /api/account/unread-counters` · app badge sync · unified realtime counter bumps · `p17-9-5:validate` PASS · **no notification center UI/deploy** |
| **P17-9-6** Notification Center | ✅ **Closed** | User center + UX polish (summary · visual hierarchy · tab counters) · parity annex · `p17-9-6:validate` + visual PASS · **no admin/deploy** |
| **P17-9-7** Admin Notification Center | ✅ **Closed** | DB + API + sync from ops queues · RBAC-filtered center UI · categories/priorities · dual fan-out contract · `p17-9-7:validate` + visual PASS · **no P17-9-8/deploy** |
| **P17-9-8** Verification Notifications | ⏳ Not opened | |
| **P17-9-9** Trust & Safety Notifications | ⏳ Not opened | |
| **P17-9-10** Aggregation Logic + Bundling UX | ⏳ Not opened | |
| **P17-9-11** Digest Foundation | ⏳ Not opened | |
| **P17-9-12** Monitoring + Metrics + DLQ | ⏳ Not opened | |
| **P17-9-13** Production push verification (unified OS push) | 🔄 **Open** | Delivery-policy + message.received producer + SA badge + permission opt-in · deploy + Android device matrix pending · [closure report](./architecture/P17-9-13-closure-report.md) |
| **P17-9-14** Production Readiness Review | ⏳ Not opened | |
| **P17-9-15** Production Rollout Plan | ⏳ Not opened | |
| **P17-9-16** Production Deploy + report resolution notifications | ✅ **Closed — Production verified** | Commit `d071ea3` · API `souq-api:p17-9-16-20260611` · `p17-9-16-report-resolution-prod-verify` PASS (6/6 scenarios · realtime · counters) |
| **P17-9-17** Platform Broadcasts | ✅ **Closed — Production verified** | Commit `2b20b74` · API `souq-api:p17-9-17-20260611` · Frontend `dpl_GoYkKBcfVa4K5a1np7vg64iuHRZ4` · backend + UI + user prod verify PASS |

---

### P0 — Deployment Governance (ADR-006)

| Sub-Phase | Status | Notes |
|-----------|--------|-------|
| **P0-DG-0** | ✅ **Closed** | ADR-006 drafted — Git-only Production frontend SSOT |
| **P0-DG-1** | ✅ **Closed** | Docs only — [006-git-only-production-frontend-deploy.md](./architecture/adr/006-git-only-production-frontend-deploy.md) (**Accepted**) · [P0-production-frontend-deploy.md](./runbooks/P0-production-frontend-deploy.md) · P17 runbook §2 · P00 updated |
| **P0-DG-2** | ✅ **Closed** | Deploy guards — `vercel-prod-deploy.mjs` blocked · `vercel-prod-emergency.mjs` · `validate-p0-dg-2-frontend-deploy-guards.mjs` |
| **P0-DG-3** | ⏳ Not opened | QA artifact policy; `.gitignore` |
| **P0-DG-4** | ⏳ Not opened | Production verification on next Git-only frontend deploy |
| **P0-DG-5** | ⏳ Not opened | Closure report + PCL |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

ADR-006 **Accepted** · **P0-DG-2 closed** (2026-06-18): Git-only frontend deploy guards live. **Next: P0-DG-3** (QA artifact policy — not opened). P9-3-ARCH-0 closed (2026-06-16). P17-9-17 closed.

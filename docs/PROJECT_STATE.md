# Souq Arab EU — Project State

**Authority:** Operational phase tracker. Engineering rules: [architecture/CONSTITUTION.md](./architecture/CONSTITUTION.md).

**Stack (official):** Vercel (frontend) · Hetzner VPS (API) · Supabase Pro (DB + storage) · WebSocket · Railway = legacy/fallback only.

**Environment refs (never mix):**

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## Execution order (current wave)

Only **one open builder phase** at a time. Sequence:

```
✅ P13-1 → … → ✅ P17-6 → ✅ P17-7-0 → ⏳ P17-7 (impl ready) → P17-8 … P17-19
```

**P17-5 closed** (STAGING DB + API closure verify PASS; buyer flow E2E signed off). **P17-4** API layer remains STAGING-gated. **Do not enable PROD** until P17-19 and explicit approval.

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
| **P17-7** Shipping workflow | ✅ **Closed** (code) | STAGING `p17-7:staging-flow` PASS · PROD deploy: [P17-5-7-production-deploy.md](./runbooks/P17-5-7-production-deploy.md) |
| **P17-8** Tracking timeline | ⏳ **Next** | After P17-5/6/7 PROD verification |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

P17-5/6/7 — **Production deployment verification** in progress ([runbook](./runbooks/P17-5-7-production-deploy.md)). P17-8 blocked until PROD smoke PASS.

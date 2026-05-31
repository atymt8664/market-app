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
✅ P13-1 → ✅ P13-2 → ✅ P13-3 → ✅ P13-4 → ✅ P8-1 (P8-1A ✅ … P8-1I ✅) → ✅ P15-1 (P15-1A ✅) → ✅ P15-2 → ⏳ P15-3 → ⏳ P17-4…P17-19
```

**Do not start P15-3+** until **P15-2** is closed. **P15-2 is closed.**

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
| P15-3 Hot path migration | ⏳ **Open** | P15-3A–3E ✅ · analytics/purge deferred |
| P15-4 Production hardening | ⏳ Blocked | After P15-3 |

### Downstream

| Phase | Status |
|-------|--------|
| P17-4 … P17-19 | ⏳ Blocked |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

P15-3E — **Closed**: ops cron on STAGING (`ops.sla_escalate`). Parent **P15-3 open** — analytics rollup (P15-3F) / storage purge (P15-3G) remain.

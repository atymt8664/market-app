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
✅ P13-1 → ✅ P13-2 → ✅ P13-3 → ✅ P13-4 → ⏳ P8-1 (P8-1A ✅ · P8-1B ✅ · P8-1C ✅ · P8-1D ✅ · P8-1E ✅) → ⏳ P15-1 → ⏳ P17-4…P17-19
```

**Do not start** P15-1 or P17-4+ until **P8-1** is closed. **Do not start P8-1F+** until **P8-1E** is closed.

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
| **P8-1E** i18n closure | ✅ **Closed** | Admin locale switcher · ar/en/de parity · RTL/LTR · `p8.admin.billing/plans` |
| P8-1F Dashboard contracts | ⏳ Open | |
| P8-1G Billing/plans boundary | ⏳ Open | **P10** defer |
| P8-1H P13 CPU hook | ⏳ Open | |
| P8-1I STAGING verify + P8-1 close | ⏳ Open | |
| **P8-1** (parent) | ⏳ **Open** | Closes when P8-1I complete |

### Downstream

| Phase | Status |
|-------|--------|
| P15-1 | ⏳ Blocked (after P8-1) |
| P17-4 … P17-19 | ⏳ Blocked |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

P8-1E — i18n closure closed. Next: **P8-1F**. Parent **P8-1** remains open.

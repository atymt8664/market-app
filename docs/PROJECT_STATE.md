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
✅ P13-1 → ✅ P13-2 → ✅ P13-3 → ⏳ P13-4 → ⏳ P8-1 → ⏳ P15-1 → ⏳ P17-4…P17-19
```

**Do not start** P8-1, P15-1, or P17-4+ until **P13-4** is closed.

---

## Phase status

### P11 — PWA / Brand / SEO surface

| Milestone | Status |
|-----------|--------|
| P11-1 Logo / Favicon / PWA icons | ✅ Closed |
| P11-2 | ✅ Closed |
| P11-3 | ✅ Closed |
| P11-4 SEO foundation | ✅ Closed |
| P11-5 Social / OG meta | ✅ Closed |

### P3 — Browse / Home

| Milestone | Status |
|-----------|--------|
| P3-1 … P3-4 | ✅ Closed |
| P3-5 Homepage structured data | ✅ Closed |

### P4 — Listings

| Milestone | Status |
|-----------|--------|
| P4-1 Ad JSON-LD (Product/Offer) | ✅ Closed |

### P13 — Analytics & Observability

| Milestone | Status | Notes |
|-----------|--------|-------|
| P13-1 Google Search Console readiness | ✅ Closed | `gsc:p13:validate`, `gsc:p13:prod` |
| P13-2 Global visual identity `#0A0A0A` | ✅ Closed | User-facing baseline unified |
| **P13-3-0** Charter + SLOs | ✅ Closed | [P13-3 charter](./architecture/P13-3-index-monitoring-cwv.md) |
| **P13-3-A** Index Monitoring | ✅ Closed | `index:p13:validate` / `index:p13:prod` + [GSC runbook](./architecture/P13-3-A-gsc-runbook.md) |
| **P13-3-B** Core Web Vitals | ✅ Closed | RUM + lab gates; prod verified 2026-05-31 |
| **P13-3** (full) | ✅ Closed | Commit `44b0e21` · VPS `souq-api:p13-3-cwv-20260531` · Vercel deploy `4876403415` |
| P13-4 | ⏳ Open | Unblocked — next builder phase |

### Downstream (blocked)

| Phase | Status |
|-------|--------|
| P8-1 | ⏳ Blocked (after P13-4) |
| P15-1 | ⏳ Blocked |
| P17-4 … P17-19 | ⏳ Blocked |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**
- Dark Premium · Lime Accent · Mobile First · RTL First
- Forbidden rollbacks: `bg-card`, `zinc-900`, `zinc-950`, `#10131A`, `#0A0D12` as page baseline

---

## Last updated

P13-3 — Index monitoring + CWV RUM/lab production verification closed. Next: P13-4.

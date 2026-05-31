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
✅ P13-1 → ✅ P13-2 → ✅ P13-3 → ✅ P13-4 → ⏳ P8-1 → ⏳ P15-1 → ⏳ P17-4…P17-19
```

**Do not start** P15-1 or P17-4+ until **P8-1** is closed.

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

### Downstream

| Phase | Status |
|-------|--------|
| **P8-1** | ⏳ **Open — unblocked** |
| P15-1 | ⏳ Blocked (after P8-1) |
| P17-4 … P17-19 | ⏳ Blocked |

---

## Visual identity (frozen)

- Background: **`#0A0A0A`**

---

## Last updated

P13-4 — AI discoverability + Knowledge Graph production verification closed. Next: P8-1.

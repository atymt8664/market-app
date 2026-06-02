# P9-A — Home Stability Checklist

**Authority:** [P09-home-stability-contract.md](../architecture/P09-home-stability-contract.md)

**When to run:** Before any deploy touching Home cold path (§9 contract files). Mandatory for P3/P9/P11 frontend deploys.

**Environment:** STAGING first (`qkczposlooaldmsjfmun`). Production only with Mohamed approval.

---

## Automated gates (must PASS)

```bash
pnpm --filter @workspace/souq run typecheck
pnpm --filter @workspace/souq run build
pnpm --filter @workspace/souq run i18n:check
pnpm --filter @workspace/souq run p9-a:validate
pnpm --filter @workspace/souq run test:home-stability
```

---

## Home

| # | Check | PASS | FAIL |
|---|-------|------|------|
| H1 | `/` loads without white flash | Dark `#0A0A0A` from first paint | White/unstyled flash |
| H2 | Search bar + categories visible | Header renders | Missing header |
| H3 | Featured section heading visible | "إعلانات مميزة" (or locale equivalent) | Missing section |
| H4 | **All** featured cards render | Multiple cards in strip when API returns >1 | Single card only |
| H5 | Recommended section present | Heading + grid or skeleton | Missing section |
| H6 | No stuck shell overlay | `#p7-lcp-layer` removed after load | Shell blocks interaction |
| H7 | Bottom navigation works | Tap navigates | Broken nav |

---

## Featured

| # | Check | PASS | FAIL |
|---|-------|------|------|
| F1 | Featured cards clickable | Opens `/ad/:id` | Dead links |
| F2 | Lead card image loads | First tile has image | Broken lead only |
| F3 | Horizontal scroll works | Strip scrolls RTL/LTR | Stuck / jumpy |
| F4 | No auth/favorite buttons on cold path | Clean card chrome | Favorite button on Home feed |
| F5 | Count matches API | Visual count ≈ API featured count | Partial render |

---

## Recommended

| # | Check | PASS | FAIL |
|---|-------|------|------|
| R1 | **No featured IDs in Recommended** | Zero overlap | Duplicate ad in both sections |
| R2 | Grid populates on scroll/near view | Cards appear | Empty after 5s idle |
| R3 | Progressive load | More cards on scroll | All 20+ cards instant (perf regression signal) |
| R4 | Test/CSRF seed ads hidden | No "csrf t" titles visible | Test ads visible |

---

## Refresh

| # | Check | PASS | FAIL |
|---|-------|------|------|
| RF1 | Soft refresh (`F5` / pull-to-refresh) | Stable transition to full feed | Persistent flicker |
| RF2 | Featured strip complete after refresh | All cards | Single-card flash |
| RF3 | No duplicate featured in recommended after refresh | Dedupe holds | Duplicates appear |

---

## Hard Refresh

| # | Check | PASS | FAIL |
|---|-------|------|------|
| HR1 | Hard refresh (`Ctrl+Shift+R` / clear cache reload) | Feed loads correctly | Stuck shell |
| HR2 | No DOM handoff artifact | No `react-lcp-slot` in DOM | Handoff slot present |
| HR3 | Categories skeleton → loaded | Stable slot keys, no root flicker | Category strip teardown flash |

---

## Mobile

| # | Check | PASS | FAIL |
|---|-------|------|------|
| M1 | Android Chrome — Home cold load | H1–H7 pass | Any FAIL |
| M2 | Featured horizontal scroll touch | Smooth | Janky / blocked |
| M3 | Recommended scroll vertical | Smooth expansion | Layout jump (CLS) |
| M4 | Safe area respected | Header clears notch | Content under status bar |

---

## Desktop

| # | Check | PASS | FAIL |
|---|-------|------|------|
| D1 | Desktop browser — Home cold load | H1–H7 pass | Any FAIL |
| D2 | Wider grid columns | 3–5 col recommended grid | Broken layout |
| D3 | Refresh on desktop | RF1–RF3 pass | Flicker |

---

## Admin

| # | Check | PASS | FAIL |
|---|-------|------|------|
| A1 | `/admin` loads admin UI | Login or dashboard | Home shell / featured strip |
| A2 | `/admin-login` loads | Admin login form | Home LCP layer |
| A3 | No `#p7-lcp-candidate` in DOM | Absent | Shell img present |
| A4 | Admin navigation works | Shell nav items | Broken admin |

---

## Non-Home routes

| # | Route | PASS | FAIL |
|---|-------|------|------|
| N1 | `/ad/:id` | Ad detail, no shell | Shell visible |
| N2 | `/categories` | Categories page | Shell visible |
| N3 | `/search?q=test` | Search results | Shell visible |
| N4 | `/login` | Auth page | Shell visible |
| N5 | Navigate Home → Ad → Back | SPA back works; no shell re-inject on back | Shell on back |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Tester | | | PASS / FAIL |
| P3/P9 reviewer | | | PASS / FAIL |

**Overall PASS:** All automated gates green + zero FAIL rows above.

**Immediate FAIL (block deploy):** R1, A1, A2, N1–N5, H4, H6, HR2, any DOM handoff pattern.

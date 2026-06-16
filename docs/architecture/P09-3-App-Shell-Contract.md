# P9-3 — App Shell Contract

| Field | Value |
|-------|-------|
| **Code** | P9-3 (Cold Start Contract — App Shell architecture) |
| **Parent** | **P9** Performance · **P3** Browse/Home · **P11** PWA shell |
| **Status** | **Active — binding architecture SSOT** (documentation approved; **implementation not started**) |
| **Authority** | **SSOT** for App Shell · Header · Bottom Navigation · Safe Area · Language Gate · Cold Start · Layout Stability · tab routes (Home / Favorites / Create Ad / Messages / Profile) |
| **Charter** | [CONSTITUTION.md](./CONSTITUTION.md) · [PROJECT_STATE.md](../PROJECT_STATE.md) · [P09-home-stability-contract.md](./P09-home-stability-contract.md) · [P09-performance.md](./P09-performance.md) |
| **Evidence (real device)** | `diagnostics/doc_2026-06-16_13-11-27.mp4` · extracted frames under `diagnostics/frames/` and `diagnostics/frames-hd/` |

**Related:** [P9-A Home Stability](./P09-home-stability-contract.md) (LCP content layer — **subordinate**, not superseded) · P9-2 Language Gate (closed — **extended** by §8) · P9-3E Safe Area · P9-3H Tab chrome

**Visual identity (frozen):** Dark Premium UI · Lime Accent · RTL Arabic · Card-based UI · `rounded-2xl` · **current** header shape · **current** bottom navigation shape · `#0A0A0A` background. This contract changes **structure and ownership**, not design tokens.

---

## 1. Purpose

This document exists to:

1. Convert the approved **Final App Shell Blueprint** into a **binding engineering contract** inside the repository.
2. Provide the **single SSOT** for all P9-3 implementation work (App Shell, chrome stability, cold start, layout stability on iPhone A2HS and parity surfaces).
3. Prevent recurrence of real-device failures that Playwright emulation **failed to detect** (safe-area = 0, no `navigator.standalone`, late measurement after 800ms+).
4. Separate **chrome** (fixed application frame) from **content** (progressive loading) so the same visual identity renders **without layout shift**.

**No P9-3 implementation PR may merge without demonstrating alignment to this contract.**

---

## 2. Scope

This contract covers:

| Area | Detail |
|------|--------|
| **App Shell** | Five-layer vertical frame: Safe Top · Header Slot · Content Slot · Bottom Nav · Safe Bottom |
| **Chrome** | Header · Bottom Navigation · Safe Area — **stable from first application frame** |
| **Content** | Skeleton · feed · lists · forms · images · API data — **inside Content Slot only** |
| **Language Gate** | First-launch fullscreen takeover — **no Home or skeleton behind** |
| **Cold Start** | Boot sequence for returning users and post-gate users on A2HS / standalone / TWA / browser |
| **Layout Stability** | CLS budget on chrome; tab navigation stability |
| **Routes** | `/` (Home) · `/favorites` · `/new` & `/create-ad` (Create Ad) · `/messages` · `/profile` |
| **Platforms** | iPhone A2HS (primary evidence) · Android TWA/PWA · Safari · desktop browser (non-regression) |

**Subordinate contracts (remain binding):**

- **P9-A** — Home LCP `#p7-lcp-layer` lifecycle on `GET /` only (content layer).
- **P9-2** — Language Gate isolation (extended, not replaced).
- **P9-3A** — SW boot lock during Home cold start.
- **P9-3C/D/E** — First-frame offset, safe-area bootstrap (consolidated under §10).

---

## 3. Non-Goals

This contract does **not**:

| Exclusion | Reason |
|-----------|--------|
| Redesign UI / new visual language | Identity frozen |
| Change colors, lime accent, card radius, header/nav **appearance** | Design System |
| API · Supabase · VPS changes | Frontend-only wave |
| P17 checkout / immersive routes behavior | Separate navigation contract |
| P9-4+ CI matrix definition | Future phases |
| iOS launch card animation | OS layer — outside app control |
| Performance optimization beyond stability-required changes | P9-A gate until P9-3 closes |
| Opening P9-4 or later phases | EDP — one open builder phase |

---

## 4. Current Problems

Problems **proven** by real iPhone 11 A2HS video (`diagnostics/doc_2026-06-16_13-11-27.mp4`) and prior root-cause diagnosis. Symptoms are listed only as evidence anchors.

| # | Problem | Root cause (architectural) | Video evidence |
|---|---------|---------------------------|----------------|
| 1 | Multi-phase cold start | Layered boot: OS card → static HTML shells → `lcp-loader` → React → chrome handoff | `frames-hd/frame_0005.png` → `frame_0009.png` → `frame_0011.png` |
| 2 | Header shift at boot | Static `#p7-header-shell` dismissed; React header paints without search row; `headerOffsetPx` changes via `ResizeObserver` | `frame_0009` (no search) → `frame_0011` (search visible) |
| 3 | Bottom nav visual drift / gap | `--souq-safe-bottom` on nav **and** in scroll-end spacer (`min-h` includes safe-bottom); Playwright `env(safe-area)=0` | `frame_0085`, `frame_0100`, `frame_0120` — black gap below nav |
| 4 | `favorites.title` raw i18n | Gate dictionary lacks `favorites.title`; full locale loads async in `useEffect`; `favorites.tsx` has no locale subscription | `frame_0085.png` |
| 5 | Home ≠ tab pages layout | Split contracts: Home `fixed` header vs tabs `sticky` vs Profile `content-safe-top` on container | Compare `frame_0011` vs `0085` vs `0100` vs `0120` |
| 6 | Layout shift first seconds | Sum of chrome handoff + safe-area + header height changes | Cold-start window 9.5s–13.5s in video |
| 7 | Playwright PASS vs device FAIL | Tests stabilize after 800ms+; no standalone context; safe-area = 0 | `p9-3-real-device-diagnosis.mjs` disclaimer |

---

## 5. Final App Shell Blueprint

### 5.1 Five-layer shell (binding target state)

```
┌─────────────────────────────────────────────────────────┐
│  L0  Safe Area Top                                      │
│      --souq-safe-top · below notch / status bar         │
├─────────────────────────────────────────────────────────┤
│  L1  Header Slot                                        │
│      variant: home-search | tab-title                   │
│      fixed plane · z-40 · height frozen at frame 0      │
├─────────────────────────────────────────────────────────┤
│  L2  Content Slot                                       │
│      flex-1 · scroll · ONLY layer for skeleton/data     │
├─────────────────────────────────────────────────────────┤
│  L3  Bottom Navigation                                  │
│      fixed bottom-0 · 5 tabs · single component         │
├─────────────────────────────────────────────────────────┤
│  L4  Safe Area Bottom                                   │
│      --souq-safe-bottom · owned by L3 padding-bottom    │
│      ONLY (no duplicate in scroll spacer)               │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Golden rule

> **Chrome stable · Content variable.**  
> Header · Bottom Nav · Safe Area · Shell structure must **not** jump or re-mount between tab routes.

### 5.3 Before → After (boot model)

**Before (current production architecture — problem source):**

```
Tap A2HS
  → iOS Launch Card (OS)
  → index.html safe-area probe
  → Static #p7-header-shell
  → Static #p7-lcp-layer
  → Static #p7-bottom-nav-shell
  → lcp-loader.ts (wait LCP)
  → main.tsx + deferred styles
  → React App
  → dismissHomeHeaderShell() → React HomeFeedHeader (search late)
  → headerOffsetPx shift
  → dismissHomeBottomNavShell() → portal BottomNav
  → feed skeleton / data
  → tab routes: per-page header contracts + double safe-area
```

**After (target — this contract):**

```
Tap A2HS
  → iOS Launch Card (OS — out of scope)
  → Safe Area probe (sync, once, before chrome)
  →
  ┌─ if !hasSavedLocale() ─────────────────────────────┐
  │  Language Gate fullscreen — blocks ALL below         │
  │  Continue → save locale → Shell path                 │
  └──────────────────────────────────────────────────────┘
  →
  ┌─ Returning / post-gate ─────────────────────────────┐
  │  App Shell (single frame — no chrome handoff)        │
  │    L0 Safe Top                                     │
  │    L1 Header (home-search complete · frame 0)        │
  │    L2 Content (Edge LCP optional · skeleton · data)  │
  │    L3 Bottom Nav (frame 0 · same rect all routes)    │
  │    L4 Safe Bottom (nav pb only)                      │
  └──────────────────────────────────────────────────────┘
  → Tab navigation: Shell persists · L2 swaps · L1 variant swaps in-place
```

### 5.4 First-frame ownership

| Scenario | First application frame owner | Visible |
|----------|------------------------------|---------|
| First launch (`!app_locale`) | **Language Gate only** | Gate UI — zero chrome behind |
| Returning user | **App Shell** | L0–L4 with Home header variant + Bottom Nav |
| After Gate Continue | **App Shell** | Direct to Home inside shell — no intermediate header-less phase |

### 5.5 DOM target (conceptual)

```
<body>
  ├── --souq-safe-* on <html> (sync)
  ├── App Shell root
  │     ├── L1 Header Slot
  │     ├── L2 Content Slot (Router outlet)
  │     └── (L3 via portal to body)
  └── L3 Bottom Nav (fixed portal)

  ✅ #p7-lcp-layer — L2 only (Home · P9-A)
  ❌ #p7-header-shell — independent owner (retired)
  ❌ #p7-bottom-nav-shell — independent owner (retired)
```

---

## 6. Chrome Contract

Chrome = L0 + L1 + L3 + L4. **Immutable during tab navigation.**

| Element | Stability rules |
|---------|-----------------|
| **Safe Area Top (L0)** | Set before first chrome paint; no re-probe causing CLS except `orientationchange` |
| **Header (L1)** | Present from frame 0; below notch; height frozen after boot lock window (≤2 frames) |
| **Bottom Nav (L3)** | `fixed inset-x-0 bottom-0`; same `getBoundingClientRect()` across Home · Favorites · Create Ad · Messages · Profile |
| **Safe Area Bottom (L4)** | Single owner: nav shell `padding-bottom` only |

**Forbidden on chrome:**

- Skeleton placeholders in header or nav
- Raw i18n keys (e.g. `favorites.title`)
- Height changes after mount due to lazy CSS or missing search row
- Static shell → React replacement of header or nav
- Per-page safe-top on content container when L1 exists (Profile migration required)

---

## 7. Content Contract

**Owner:** L2 Content Slot — route components and P9-A LCP layer.

| Allowed progressive loading | Location |
|----------------------------|----------|
| `HomeFeedSkeleton` · feed shells | L2 Home |
| Featured / recommended API · images | L2 Home |
| Category strip **data** (icons/labels) | L2 influence on L1 **only** if strip height pre-reserved at frame 0 |
| Favorite list skeleton · ad cards | L2 Favorites |
| Inbox skeleton · conversation rows | L2 Messages |
| Create Ad form steps · upload | L2 Create Ad |
| Profile metrics · ads · avatars | L2 Profile |
| Edge `#p7-lcp-candidate` img (P9-A) | L2 Home — hidden/lead only |

**Forbidden in content contract violations:**

- Skeleton or loading UI in L1 or L3
- Content layout that changes L3 position (no `min-h` stacking with `100dvh` + nav padding on page shell)
- Scroll-end spacer including `--souq-safe-bottom` (see §12)

---

## 8. Language Gate Contract

Extends closed **P9-2** for App Shell integration.

| Rule | Binding |
|------|---------|
| **Trigger** | `!hasSavedLocale()` — sync read before first React render decision |
| **Visibility** | Fullscreen · z above all shells and `#root` chrome |
| **Behind gate** | ❌ Home · ❌ Skeleton · ❌ ads · ❌ `#p7-header-shell` · ❌ `#p7-lcp-layer` · ❌ `#p7-bottom-nav-shell` · ❌ App Shell L1/L3 |
| **Boot path** | `lcp-loader` must not boot Home warm path or show feed shell while gate active |
| **On Continue** | Persist locale → transition to App Shell → Home in L2 with full L1 home-search variant |
| **UI** | Gate copy and visual design **unchanged** (P9-2 closed) |

**First paint decision tree:**

```
!hasSavedLocale() → render Gate ONLY
hasSavedLocale()  → render App Shell (skip Gate)
```

---

## 9. Cold Start Contract

### 9.1 Principles

1. **Chrome boot ≠ Content boot** — only L2 may pass through multiple phases.
2. **No chrome handoff** — eliminate static header/nav replacement by React.
3. **P9-A preserved** — Edge LCP injection on `GET /` only; `#p7-lcp-layer` sibling of `#root`; dismissal via `dismissHomeLcpLayer()` when content ready.

### 9.2 Returning-user sequence (target)

| Step | Actor | Action |
|------|-------|--------|
| 1 | `index.html` | Sync safe-area probe · `standalone-pwa` class if A2HS |
| 2 | `lcp-loader.ts` | If Home + saved locale: optional wait for LCP **content** img only |
| 3 | `main.tsx` | `ensureBootstrapLocales()` · critical CSS for chrome |
| 4 | `App.tsx` | App Shell mount — L1 + L3 from frame 0 |
| 5 | `home.tsx` | L2: skeleton → feed; dismiss LCP layer when feed gate opens |
| 6 | `home-cold-start.ts` | P9-3A boot lock until `markHomeColdStartReady()` |

### 9.3 First-launch sequence (target)

| Step | Action |
|------|--------|
| 1 | Strip all `#p7-*` shells before paint |
| 2 | Language Gate only |
| 3 | On Continue → App Shell + Home (no intermediate chrome-less Home) |

### 9.4 CLS budget

| Layer | CLS after frame 2 |
|-------|-------------------|
| L0–L1–L3–L4 | **0** — no measurable shift |
| L2 | Allowed — skeleton → content |

---

## 10. Safe Area Contract

| Rule | Detail |
|------|--------|
| **Single probe (sync)** | `index.html` inline `measureStandaloneInsets()` before chrome |
| **Reinforcement** | `standalone-safe-area.ts` listeners on standalone only |
| **CSS variables** | `--souq-safe-top` · `--souq-safe-bottom` on `document.documentElement` |
| **Top consumer** | L1 Header Slot — `pt-[var(--souq-safe-top,...)]` |
| **Bottom owner** | L3 Bottom Nav — `pb-[var(--souq-safe-bottom,...)]` **only** |
| **Non-standalone** | `env(safe-area-inset-*)` fallback; Android browser `env()=0` → no visual change (existing P9-3H rule) |
| **Forbidden** | `--souq-safe-bottom` in `BOTTOM_NAV_SCROLL_END_SPACER_CLASS` · duplicate probe causing nav jump |

**Files (reference — implementation phase):** `index.html` · `standalone-safe-area.ts` · `tab-ios-layout.ts` (consumers only)

---

## 11. Header Contract

### 11.1 Owner

| Owner | Responsibility |
|-------|----------------|
| **App Shell — Header Slot (L1)** | Mount plane · safe-top · z-index · frozen height budget |
| **`AppChromeHeader` (target component)** | Variant switch · wraps existing visual components |
| **`home-search` variant** | Existing `HomeFeedHeader` UI — search · location · bell · categories strip |
| **`tab-title` variant** | Existing sticky pill headers — Favorites · Messages · Create Ad · Profile |

### 11.2 Must NOT own header

| Actor | Forbidden |
|-------|-----------|
| `#p7-header-shell` (static) | Independent lifecycle / dismiss handoff |
| Individual pages | Direct safe-top on page container when L1 active (Profile migration) |
| Content Slot (L2) | Header-like chrome |
| Edge middleware | Header injection (P9-A: content layer only) |

### 11.3 Variants (visual identity unchanged)

| Variant | Routes | Position | Visual (frozen) |
|---------|--------|----------|-----------------|
| `home-search` | `/` | `fixed top-0` | Search bar · lime borders · categories strip |
| `tab-title` | `/favorites` · `/messages` · `/new` · `/profile` | `sticky top-0` within L1 plane | Pill title · icon circle · `rounded-2xl` badge |

### 11.4 Home header rules

- Search row **visible at frame 0** — no phase without search bar.
- `headerOffsetPx` / `--p7-home-header-offset` **frozen** after boot lock (≤2 frames).
- Categories may load data progressively; **strip height reserved** at frame 0.

---

## 12. Bottom Navigation Contract

### 12.1 Owner

| Owner | Responsibility |
|-------|----------------|
| **`layout.tsx` → `BottomNav`** | Single instance · `createPortal(..., document.body)` |
| **`BOTTOM_NAV_FIXED_SHELL_CLASS`** | Position · safe-bottom padding · visual chrome |
| **Gate i18n** | Tab labels on cold path (`bottom_nav.*` in gate locales) |

### 12.2 Must NOT own bottom nav

| Actor | Forbidden |
|-------|-----------|
| `#p7-bottom-nav-shell` (static) | Handoff to React nav |
| Page components | Per-page nav positioning · extra bottom padding for safe-area |
| Scroll-end spacer | `safe-bottom` inclusion (button height only: 50px / 56px) |
| Content Slot | Nav placeholders |

### 12.3 Stability rules

- Same `bottom: 0` rect on: Home · Favorites · Create Ad · Messages · Profile.
- Active tab highlight only — no bar reflow.
- Hidden only on **immersive routes** (existing contract): message thread · checkout · settings/legal · admin · auth pages.

---

## 13. Page Ownership Matrix

| Page | L1 Header variant | L2 Content | L3 Bottom Nav | Safe Area | Fixed (no progressive load) | Progressive load allowed |
|------|-------------------|------------|---------------|-----------|----------------------------|-------------------------|
| **Home** | `home-search` | Feed · featured · recommended | Visible · 5 tabs | L0/L4 via shell | Shell · header shape · nav position | Ads · images · category labels · feed skeleton |
| **Favorites** | `tab-title` «المفضلة» | Favorite list · empty state | Same nav · fav active | Same vars | Shell · nav · header plane | `useListFavoriteAds` · card images |
| **Create Ad** | `tab-title` (create-ad headings) | Form steps · upload | Same nav · post promote | Same vars | Shell · nav | Validation · storage upload · API |
| **Messages** | `tab-title` «الرسائل» | Inbox rows · collections | Same nav · messages active | Same vars | Shell · nav | Conversations API · realtime · skeleton |
| **Profile** | `tab-title` (account strip — **migrated to L1**) | Avatar · metrics · tabs · ads | Same nav · profile active | Same vars | Shell · nav | Profile API · ads list · images |

**Tab navigation invariant:** L0 · L1 plane · L3 · L4 unchanged; L2 and L1 variant label/icon swap only.

---

## 14. Do Not Touch List

| Item | Reason |
|------|--------|
| Visual identity — `#0A0A0A` · lime `primary` · `rounded-2xl` · card borders | Frozen |
| `HomeFeedHeader` · `MarketplaceSearchBar` · `BottomNav` **visual JSX** | Relocate to slots — do not redesign |
| P9-A: Edge `GET /` only · `#p7-lcp-layer` sibling `#root` | Closed contract |
| LCP `featuredLead` image pipeline (P9-D) | Production verified |
| `buildHomeRecommendedFeed()` dedupe | P9-A |
| P17 immersive routes (hide nav) | Separate scope |
| API · Supabase · VPS | Not in P9-3 |
| Production Supabase `nptfxtkedqndkgmrcntn` | Constitution |
| P9-1 Location Picker (closed) | No regression |
| P9-3A SW boot lock semantics | Unless dedicated sub-phase |
| Language Gate UI copy/layout (P9-2 closed) | Extend behavior only |
| `theme-shared.css` color tokens | Identity |

---

## 15. Regression Risks

| Risk | Source | Mitigation |
|------|--------|------------|
| PSI LCP regression | Moving/delaying P9-A content layer | `p9-a:validate` · PSI ≤ P9-D baseline + 0.5s |
| Featured duplicate / flicker | Shell lifecycle change | P9-A guards |
| Android `env=0` breakage | Safe-area contract change | P9-3E parity scripts · non-standalone path |
| Gate flash (Home behind) | App.tsx render order | `p9-2-language-gate-isolation-verify` + video E1 |
| Header overlap / gap | Frozen offset wrong | First-frame scripts · video E2 |
| Nav overlap content | Spacer change | Tab scroll clearance tests |
| Profile notch gap | L1 migration | Video E9 |
| Raw i18n keys | Gate sync miss | `sync-home-gate-locales.mjs` · video E4 |
| CSP inline hash drift | `index.html` bootstrap change | `vercel.json` hash update in same PR |
| Immersive route nav leak | Shell always shows nav | Existing `hideBottomNav` paths |

---

## 16. Success Criteria

Implementation is **not** complete until all criteria pass.

### 16.1 Automated guards

| Guard | Required |
|-------|----------|
| `p9-a:validate` | PASS |
| `p9-2-language-gate-isolation-verify` | PASS |
| `p9-3c-first-frame-verify` | PASS |
| `p9-3d-safe-area-verify` | PASS |
| `p9-3e-standalone-parity-verify` | PASS |
| `p9-3h-tab-chrome-verify` | PASS |
| `i18n:check` + `sync-home-gate-locales` | PASS |
| `p9-b:guards` (CI) | PASS |

**Playwright alone is not sufficient for P9-3 closure.**

### 16.2 Real device video (iPhone A2HS — SSOT)

| ID | Scene | PASS |
|----|-------|------|
| **E1** | First launch | Gate only — zero skeleton/home behind |
| **E2** | Cold start returning | Search in frame 0 · header height stable 0–2s |
| **E3** | 5-tab switch | Nav `getBoundingClientRect().bottom` identical ±0px |
| **E4** | Favorites | «المفضلة» — never `favorites.title` |
| **E5** | 125ms frames | No L1 height change between frame N and N+2 |
| **E6** | Full session video | E1–E5 in one continuous recording |
| **E7** | PSI LCP Home | ≤ P9-D baseline + 0.5s |

### 16.3 Sign-off

- **Mohamed explicit approval** on video E6 + automated guards.

---

## 17. Rollback Criteria

Revert the implementation PR / redeploy previous Vercel deployment when **any**:

| Trigger | Action |
|---------|--------|
| Video shows new chrome CLS | Immediate revert |
| `p9-a:validate` FAIL | Revert — P9-A priority |
| PSI LCP > P9-D baseline + 0.5s | Revert + analysis |
| Language Gate regression | Revert Gate-related changes |
| Raw i18n key in chrome | Block release or revert |
| Nav content overlap on any tab | Revert spacer/safe-area change |
| Mohamed reports Android/TWA visual regression | Revert + isolate standalone flag |
| Immersive route shows bottom nav incorrectly | Revert Shell frame change |

**Documentation-only commits (this file) do not require production rollback.**

---

## Appendix A — Relationship to P9-A

| Concern | P9-A (current) | P9-3 App Shell (target) |
|---------|----------------|-------------------------|
| `#p7-lcp-layer` | Content LCP shell | **Stays in L2** — no ownership change |
| `#p7-header-shell` | Static chrome | **Retired** — L1 owns header |
| `#p7-bottom-nav-shell` | Static chrome | **Retired** — L3 owns nav |
| `dismissHomeLcpLayer()` | Content dismissal | **Unchanged** |
| `dismissHomeHeaderShell()` | Chrome handoff | **Removed** in implementation |

P9-A remains authoritative for **feed LCP** until explicitly amended by a signed P9-3 sub-phase that cites this appendix.

---

## Appendix B — i18n Chrome Keys (minimum gate set)

Tab chrome titles must exist in `gate/*.json` before first paint:

| Key | Routes |
|-----|--------|
| `favorites.title` | Favorites L1 |
| `messages.title` | Messages L1 |
| Create Ad section keys (existing) | Create Ad L1 |
| Profile chrome keys (existing) | Profile L1 |
| `bottom_nav.*` | L3 (already in gate) |
| `home.search_placeholder` | Home L1 (already in gate) |

Full `ar.json` async load must not block chrome strings.

---

*Document version: 1.0 · Architecture Documentation Phase · Implementation pending Mohamed approval.*

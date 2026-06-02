# P9-A — Home Regression Guard Plan

**Authority:** [P09-home-stability-contract.md](../architecture/P09-home-stability-contract.md)

**Purpose:** Define what must be tested before any future deploy that touches Home, and what constitutes automatic FAIL.

---

## 1. Guard layers

| Layer | When | Command / action |
|-------|------|------------------|
| **L1 — Unit** | Every PR touching Home libs | `pnpm --filter @workspace/souq run test:home-stability` |
| **L2 — Static source** | Every PR touching §9 contract files | `pnpm --filter @workspace/souq run p9-a:validate` |
| **L3 — Build dist** | CI build | `build` hooks: `validate-p7-pr-12`, `validate-p7-pr-14` |
| **L4 — Manual checklist** | Pre-deploy STAGING | [P9-A-home-stability-checklist.md](./P9-A-home-stability-checklist.md) |
| **L5 — Production smoke** | Post-deploy (approved) | Checklist rows A1, H4, R1 on production URL |

---

## 2. Pre-deploy gate (mandatory)

Before **any** Vercel deploy touching `artifacts/souq` Home cold path:

1. `pnpm run typecheck` — monorepo
2. `pnpm --filter @workspace/souq run build`
3. `pnpm --filter @workspace/souq run i18n:check`
4. `pnpm --filter @workspace/souq run p9-a:validate`
5. `pnpm --filter @workspace/souq run test:home-stability`
6. Manual checklist on STAGING — minimum: **H4, R1, A1, RF1, N1**

**Deploy blocked if any step fails.**

---

## 3. Regression patterns — automatic FAIL

These patterns **must never reappear**. `p9-a:validate` enforces statically where possible.

| ID | Regression | Detection | FAIL action |
|----|------------|-----------|-------------|
| G1 | DOM handoff reintroduced | Source scan: active `handoffShellLcpToReact(` calls outside deprecated definition | Block merge |
| G2 | `HOME_FEATURED_INITIAL` | Source scan | Block merge |
| G3 | `react-lcp-slot` in render path | Source scan in `.tsx` | Block merge |
| G4 | `p7-await-handoff` class added at runtime | Source scan: `classList.add("p7-await-handoff")` | Block merge |
| G5 | Featured dedupe bypassed | `home.tsx` must use `buildHomeRecommendedFeed` | Block merge |
| G6 | Shell on non-Home | `middleware.js` must gate `pathname === "/"` | Block merge |
| G7 | LCP candidate inside `#root` | `validate-p7-pr-12` dist check | Block build |
| G8 | Sync main.tsx entry | `validate-p7-pr-14` dist check | Block build |
| G9 | Featured duplicated in Recommended | `home-feed-ads.test.mjs` | Block merge |
| G10 | `/admin` shell regression | Manual A1 + `p7-home-path.test.mjs` | Block deploy |

---

## 4. Historical regressions — guard mapping

| Past incident | PR / commit | Guard preventing recurrence |
|---------------|-------------|----------------------------|
| DOM handoff flicker | P7-PR-14 `89e161e` | G1, G3, G4 + contract §8 |
| Single featured card | P7-PR-14 partial reveal | H4 checklist + contract §4 |
| Featured in Recommended | Pre-`999ce68` | G5, G9 |
| `/admin` broken by shell | Pre-`39c8ee8` | G6, G10, `isHomePathname` tests |
| SW mixed bundles | P7-PR-9 | Out of Phase A scope — `sw.js` network-only HTML unchanged |

---

## 5. CI integration (implemented — Phase B)

Phase B wires guards into `.github/workflows/ci.yml`:

```yaml
- run: pnpm --filter @workspace/souq run test:home-stability
- run: pnpm --filter @workspace/souq run p9-b:guards
```

See [P9-B-ci-validation-strategy.md](./P9-B-ci-validation-strategy.md).

---

## 6. FAIL → rollback

| Severity | Trigger | Rollback |
|----------|---------|----------|
| **P0 — immediate** | `/admin` broken, featured dupe in prod, stuck shell | Vercel instant rollback to previous deployment |
| **P1 — same day** | Flicker on refresh reproducible >50% | Vercel rollback; root-cause before re-deploy |
| **P2 — track** | Best Practices score drop | No rollback; track in Phase B observability |

**Rollback verification after revert:**

1. Re-run checklist H4, R1, A1 on rolled-back URL
2. Confirm `#p7-lcp-layer` behavior matches baseline doc

---

## 7. Files watched by L2 static guard

See contract §9. Any PR modifying these paths triggers full guard suite:

- `index.html`, `middleware.js`, `lcp-loader.ts`, `main.tsx`
- `home-lcp-handoff.ts`, `p7-home-path.ts`, `home-feed-ads.ts`
- `home.tsx`, `home-feed-sections.tsx`, `home-feed-ad-card.tsx`
- `scripts/home-lcp-shell.mjs`

---

*Phase A — documentation and scripts only. No production behavior change.*

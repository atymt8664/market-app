# P9-B — CI / Validation Strategy

**Authority:** [P09-home-stability-contract.md](../architecture/P09-home-stability-contract.md)

---

## 1. Goal

Detect Home stability regressions (**DOM handoff, featured duplication, shell on admin, flicker-related code patterns**) **before Production**, without changing runtime behavior.

---

## 2. CI pipeline (GitHub Actions)

**File:** `.github/workflows/ci.yml`

### Existing steps (unchanged)

| Step | Purpose |
|------|---------|
| `pnpm typecheck` | Types |
| API unit tests | Backend |
| `test:ws-url` | WS URL |
| `test:pool-config` | DB pool |
| `pnpm --filter @workspace/souq run build` | Frontend build + p7-pr-12/14 |
| `i18n:check` | Locales |
| P13 index / CWV readiness | Observability wiring |

### Phase B additions

| Step | Command | When | Blocks merge |
|------|---------|------|--------------|
| **Home stability unit tests** | `pnpm --filter @workspace/souq run test:home-stability` | After build | ✅ |
| **Home regression guards** | `pnpm --filter @workspace/souq run p9-b:guards` | After build | ✅ |

`p9-b:guards` includes p9-a validate (uses `dist/index.html` from build step).

### Not in CI (by design)

| Step | Reason |
|------|--------|
| `p9-b:visual` | Requires running preview server + Playwright; run on STAGING pre-deploy |
| PSI / Lighthouse prod | Requires approved prod URL + network |
| Manual checklist | Human sign-off |

---

## 3. PR workflow

```
Developer PR touching Home §9 files
        │
        ▼
   CI: typecheck + build + i18n
        │
        ▼
   CI: p9-b:guards  ──FAIL──► fix before merge
        │
        PASS
        │
        ▼
   Reviewer: confirm guard catalog coverage
        │
        ▼
   STAGING deploy (approved)
        │
        ▼
   Optional: p9-b:visual --base=<STAGING_URL>
   Manual: checklist H4,R1,A1,RF1
        │
        ▼
   PROD deploy (Mohamed approval)
        │
        ▼
   Post-deploy smoke: A1,R1,H4
```

---

## 4. Path triggers — full guard suite

Any PR modifying these paths **must** pass `p9-b:guards`:

- `artifacts/souq/index.html`
- `artifacts/souq/middleware.js`
- `artifacts/souq/public/sw.js`
- `artifacts/souq/src/lcp-loader.ts`
- `artifacts/souq/src/main.tsx`
- `artifacts/souq/src/lib/home-lcp-*`
- `artifacts/souq/src/lib/p7-home-path.ts`
- `artifacts/souq/src/lib/home-feed-ads.ts`
- `artifacts/souq/src/lib/web-vitals-reporting.ts`
- `artifacts/souq/src/pages/home*.tsx`
- `artifacts/souq/src/components/home-feed-ad-card.tsx`
- `artifacts/souq/scripts/home-lcp-shell.mjs`

---

## 5. Regression detection mapping

| Historical regression | CI detection |
|----------------------|--------------|
| DOM handoff | G1–G4 (p9-a) |
| Featured in Recommended | G5,G9 + V6 |
| Shell on `/admin` | G6,B15,B20 + V3 |
| Single featured card | B11 + H4 manual |
| Flicker / idleExpand | B17 |
| SW mixed bundles | B13 |
| Sync main entry | G8,B14 |

---

## 6. Local developer commands

```bash
# Full CI parity (from repo root)
pnpm typecheck
pnpm --filter @workspace/souq run build
pnpm --filter @workspace/souq run i18n:check
pnpm --filter @workspace/souq run p9-b:guards

# Optional visual (terminal 1: preview, terminal 2: smoke)
pnpm --filter @workspace/souq run preview
pnpm --filter @workspace/souq run p9-b:visual -- --base=http://127.0.0.1:4173
```

---

## 7. Rollback

CI guard failure → fix forward, **no deploy**.

Production stability FAIL after deploy → Vercel instant rollback → re-run `p9-b:visual` on rolled-back STAGING/PROD URL.

---

*Phase B — CI wiring only; no application behavior change.*

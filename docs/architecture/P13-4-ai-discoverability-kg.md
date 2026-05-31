# P13-4 — AI Discoverability + Knowledge Graph Readiness

| Field | Value |
|-------|-------|
| **Code** | P13-4 |
| **Status** | Active |
| **Depends on** | P13-3 (closed), P3-5, P4-1, P11-4/5 |
| **Project state** | [PROJECT_STATE.md](../PROJECT_STATE.md) |

---

## Goal

Make **Souq Arab EU** discoverable and machine-readable for:

1. **Search engines beyond Google** — Bingbot first-class prerender (Bing Webmaster readiness).
2. **AI / LLM crawlers** — explicit robots policy + `llms.txt` site summary.
3. **Knowledge Graph** — consistent first-HTML JSON-LD (`Organization`, `WebSite`, `WebApplication` on home; `Product`/`Offer` on ads) for discovery crawlers, not only Googlebot.

No third-party analytics SDKs. No secrets in git.

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| P13-4-0 | This charter + closure criteria |
| P13-4-A | Bingbot prerender + [Bing runbook](./P13-4-A-bing-runbook.md) |
| P13-4-B | `llms.txt`, robots AI rules, crawler UA wiring |
| P13-4-C | Home JSON-LD in OG/middleware prerender; `home-structured-data.mjs` sync |
| P13-4-D | `discoverability:p13:validate` / `discoverability:p13:prod` / `bing:p13:prod` |

---

## SLOs / acceptance

| Check | Local | Production |
|-------|-------|------------|
| `llms.txt` 200 with brand + sitemaps | ✅ | ✅ |
| robots.txt AI bot rules + llms reference | ✅ | ✅ |
| Homepage JSON-LD (Org + WebSite + WebApp) | ✅ | ✅ |
| Bingbot `/` prerender → Organization JSON-LD | wired | ✅ |
| Bingbot `/ad/:id` → Product JSON-LD | wired | ✅ |
| GPTBot same as Bingbot (sample) | wired | ✅ |
| No STAGING refs in SEO assets | ✅ | ✅ |

---

## Owned paths

| Layer | Paths |
|-------|-------|
| Static | `artifacts/souq/public/llms.txt`, `public/robots.txt` |
| Edge | `vercel.json`, `middleware.js`, `api/og.js`, `og-share-meta.mjs`, `home-structured-data.mjs` |
| Frontend lib | `src/lib/structured-data-foundation.ts` |
| Scripts | `scripts/p13-4-*.mjs`, `scripts/validate-p13-4-*.mjs` |
| CI | `.github/workflows/ci.yml` → `discoverability:p13:validate` |

---

## Out of scope (P13-4)

- BreadcrumbList / ItemList on browse pages (future SEO phase)
- `sameAs` social profiles without verified URLs
- IndexNow automation
- In-app AI features (**P12**)
- Admin observability UI (**P8**)

---

## Closure criteria

1. `discoverability:p13:validate` PASS in CI
2. `discoverability:p13:prod` PASS on `https://www.souq-arab.com`
3. `bing:p13:prod` PASS
4. No regression: `index:p13:prod`, `gsc:p13:prod`, `structured:p3/p4:validate`
5. `PROJECT_STATE.md` updated — P13-4 closed, P8-1 unblocked

---

## Rollback

| Layer | Action |
|-------|--------|
| Vercel | Rollback deployment to pre-P13-4 |
| `llms.txt` / robots | Revert `public/` files |
| Crawler rewrites | Revert `vercel.json` UA regex to P13-3 state |
| OG home JSON-LD | Revert `api/og.js` / `middleware.js` home handler |

---

## Related

- [P13-3 index monitoring + CWV](./P13-3-index-monitoring-cwv.md)
- [P13-3-A GSC runbook](./P13-3-A-gsc-runbook.md)
- [P13 analytics overview](./P13-analytics-observability.md)

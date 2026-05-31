# Souq Arab EU — P-Domain Architecture (Official Index)

**This is the only official planning and ownership system for the project.**

| System | Status |
|--------|--------|
| **P0 → P17 (P-Domain Architecture)** | ✅ Official |
| **Phase 1 / Phase 2 / … as independent roadmap** | ❌ Deprecated for planning — legacy paths mapped below |

Every file, script, feature, and infra folder belongs to **exactly one** P-domain.

**Charter:** [CONSTITUTION.md](./CONSTITUTION.md)

---

## P-Domain map (P0 → P17)

| Code | Domain | Doc | Status |
|------|--------|-----|--------|
| P0 | Infrastructure & hosting | [P00-infrastructure.md](./P00-infrastructure.md) | Active |
| P1 | Environments (Local / STAGING / PRODUCTION) | [P01-environments.md](./P01-environments.md) | Active |
| P2 | Authentication & sessions | [P02-authentication.md](./P02-authentication.md) | Active |
| P3 | Browse / home / discovery | [P03-browse-home.md](./P03-browse-home.md) | Active |
| P4 | Listings / ads | [P04-listings-ads.md](./P04-listings-ads.md) | Active |
| P5 | Messaging & realtime chat | [P05-messaging.md](./P05-messaging.md) | Active |
| P6 | Profile & settings | [P06-profile-settings.md](./P06-profile-settings.md) | Active |
| P7 | Trust & safety | [P07-trust-safety.md](./P07-trust-safety.md) | Active |
| P8 | Admin panel | [P08-admin.md](./P08-admin.md) | Active |
| P9 | Performance & speed | [P09-performance.md](./P09-performance.md) | Active |
| P10 | Monetization & billing | [P10-monetization.md](./P10-monetization.md) | Partial |
| P11 | PWA / TWA / Google Play | [P11-pwa-twa.md](./P11-pwa-twa.md) | Active |
| P12 | AI (descriptions / pricing) | [P12-ai.md](./P12-ai.md) | Active |
| P13 | Analytics & observability | [P13-analytics-observability.md](./P13-analytics-observability.md) · [P13-3 charter](./P13-3-index-monitoring-cwv.md) | Active — P13-3 in progress |
| P14 | Search & ranking | [P14-search-ranking.md](./P14-search-ranking.md) | Active (FTS) / ranking evolving |
| P15 | Background jobs & workers | [P15-background-jobs.md](./P15-background-jobs.md) | Planned |
| P16 | Scale architecture | [P16-scale-architecture.md](./P16-scale-architecture.md) | Planned (spike scripts exist) |
| P17 | Commerce, orders & fulfillment | [P17-commerce-orders.md](./P17-commerce-orders.md) | P17-0..4 recovered on main (spec + mock API + UI); P17-5+ not started |

---

## Which P owns this problem?

Use this table first in incidents and planning.

| Symptom / topic | P |
|-----------------|---|
| VPS down, deploy failed, nginx, Docker, SSL/DNS, rollback | **P0** |
| Wrong env, STAGING/PROD mix-up, migration guard, seed policy | **P1** |
| Login, signup, logout, session, CSRF, email verify, password reset, admin TOTP | **P2** |
| Home feed, categories browse, discovery maps (read-only) | **P3** |
| Create/edit ad, ad detail, images upload, likes/favorites, ad moderation API | **P4** |
| Chat, messages, WebSocket, typing, delete-for-everyone | **P5** |
| User profile, account settings, delete account, notification prefs UI | **P6** |
| Reports, blocks, RLS, rate limits, security headers, fraud | **P7** |
| Admin dashboard, admin users/ads/cities, support inbox, admin 2FA UI | **P8** |
| Slow images, Lighthouse, lazy load, query stale times, preload | **P9** |
| Promote ad, seller plans, billing (future payments) | **P10** |
| Buy Now, checkout, orders, fulfillment, order timeline | **P17** ([charter](./P17-commerce-orders.md); P17-0..4 on main) |
| manifest, service worker, TWA, installability | **P11** |
| AI improve description / suggest price | **P12** |
| Sentry, metrics, healthz, alerting, VPS monitor snapshots | **P13** |
| Search results, FTS, sort/ranking, recommendations | **P14** |
| Email queue, notification fan-out, thumbnails, cron cleanup | **P15** |
| Redis, queue infra, API-2/3, read replicas, horizontal scale | **P16** |
| OpenAPI / generated client | **P4** coordinates + owning P per endpoint |
| `lib/db` shared schema | Owning P per table ( **P4** coordinates) |

---

## Legacy phase paths → P-Domain

**Do not use Phase as a separate roadmap.** These folders remain on disk; classify work under P:

| Legacy path | Maps to | Notes |
|-------------|---------|-------|
| `infra/hetzner/vps-foundation/` | **P0** | OS bootstrap, nginx foundation |
| `infra/hetzner/api-readiness/` | **P0** | Phase 2 readiness → Docker stub, nginx |
| `infra/hetzner/phase1-stabilization/` | **P0**, **P1** | Stabilization + STAGING verification |
| `infra/hetzner/phase2-tail/` | **P0**, **P1** | Storage/env tail checks |
| `infra/hetzner/phase3/` | **P0**, **P5** | Nginx upstream, WS probe |
| `infra/hetzner/phase3-hardening/` | **P0**, **P7** | fail2ban, rate limits, sysctl |
| `infra/hetzner/phase4/` | **P0** | API HTTPS prep, staging smoke |
| `infra/hetzner/phase5/` | **P0**, **P13** | API cutover, baseline, WS probe |
| `infra/hetzner/phase6/` | **P0**, **P13**, **P16** | Stabilization, monitoring, Redis spike |
| `infra/hetzner/phase7/` | **P0** | Production shadow, cutover execution |
| `infra/hetzner/phase8/` | **P0** | Release deploy/verify prod shadow |
| `infra/hetzner/deploy/` | **P0** | `deploy-api.sh`, `rollback-api.sh` |
| `scripts/phase3-vps-apply.ps1` … `phase5-dns-and-cutover.ps1` | **P0** | Windows helpers |
| `scripts/staging-phase1-*` | **P1** | STAGING local/Supabase verify |
| `lib/db/migrations/010_phase_*` … `015_phase8_*` | **P4**, **P5**, **P14** | See migration filenames |
| `artifacts/souq/.lighthouse-phase*.json` | **P9** | Perf audit artifacts |
| `api-build-slim/`, `api-build-slim2/` (workspace root) | **P0**, **P1** | Duplicate trees — cleanup planned, not deleted yet |

---

## Team ownership

| Role / developer | Primary P | Reviews |
|------------------|-----------|---------|
| **Developer A** | **P4** Listings/ads | P9, P14 for ad list perf/search |
| **Developer B** | **P5** Messaging | P16 for WS scale |
| **Developer C** | **P8** Admin | P7 security, P2 for admin auth coordination |
| **Developer D** | **P9** Performance | P3, P4 for UX perf |
| **Developer E** | **P16** Scale (+ **P0** cutover) | P15 for queue |
| Platform lead | **P0**, **P1**, **P15** | All deploy/env PRs |
| Security lead | **P7** | P2, P8, P0 edge hardening |

**Rules:** Work only inside your P unless coordinated. Shared file changes need second-owner comment approval.

---

## Language architecture (summary)

| Item | Rule |
|------|------|
| Default locale | Arabic (`ar`), RTL |
| Other locales | `en`, `de` — LTR |
| Keys (target) | `p{domain}.*` — see [CONSTITUTION §12](./CONSTITUTION.md) |
| CI | `i18n:check` on every PR touching UI strings |

Full rules: [CONSTITUTION.md §12](./CONSTITUTION.md).

---

## Next priority (after P-domain documentation)

Ordered by **lowest risk / highest clarity** — **not approved for execution** until Mohamed confirms:

| Rank | Item | Type |
|------|------|------|
| 1 | **A)** P0/P1 cleanup **audit** (inventory only, no deletes) | Docs / inventory |
| 2 | **B)** `api-build-slim*` cleanup **plan** (no deletes) | Docs |
| 3 | **D)** P8 Admin i18n **plan** (`p8.admin.*`) | Docs then code |
| 4 | **E)** P15 Queue workers **plan** | Docs then code |
| 5 | **C)** P16 Redis STAGING spike | STAGING ops — needs approval |

---

## Related docs outside this folder

| Path | P |
|------|---|
| `docs/PROJECT_STATE.md` | All — phase tracker |
| `docs/PROJECT_CONSTITUTION.md` | All — charter entry |
| `docs/local-staging-isolation.md` | P1 |
| `infra/hetzner/deploy/DEPLOY.md` | P0 |

---

*Last organized: P-Domain documentation pass — architecture docs only, no application code changes.*

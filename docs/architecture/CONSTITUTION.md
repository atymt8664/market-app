# Souq Arab EU — Project Constitution

**Status:** Official engineering charter. All work must align with this document and the [P-Domain index](./README.md).

**Horizon:** 10–50 years — platform scale comparable to major classified marketplaces.

**Environment refs (never mix):**

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## 1. Architecture rules

| ID | Rule |
|----|------|
| A1 | **P-Domain supremacy** — Every file, script, and decision belongs to exactly one **P0–P16** domain. |
| A2 | **No parallel planning systems** — Legacy folder names `phase*` are **milestones inside P-domains**, not a second roadmap. |
| A3 | **Layered boundaries** — Frontend (presentation) → API (application) → DB (truth) → Infra (runtime). No business logic in Nginx or service workers. |
| A4 | **Scalability-first** — New features must state behavior at 1M+ users/ads/messages before merge. |
| A5 | **Maintainability-first** — Prefer clear modules over clever abstractions. Files >800 lines require a split plan. |
| A6 | **Sync by default, async by proof** — Heavy work (notifications fan-out, thumbnails, search indexing) moves to **P15** when load requires it. |
| A7 | **Shared schema council** — `lib/db` changes need the owning P-domain owner + **P7** review when security-related. |
| A8 | **Rollback-safe** — API deploy uses tagged Docker images + `rollback-api.sh`; never `scp` application source to VPS. |
| A9 | **Observability by default** — New API surfaces hook into **P13** (request id, metrics, errors). |
| A10 | **Minimal technical debt** — No quick fixes, temporary patches, or “works for now” coupling. |

### Approved stack (long-term)

| Layer | Technology |
|-------|------------|
| Frontend | Vercel (`artifacts/souq`) |
| Backend | VPS Hetzner (`artifacts/api-server`) |
| Database + Storage | Supabase |
| Scale (when needed) | API replicas, Redis, queue workers, pub/sub, read replicas, monitoring |

---

## 2. Folder rules

| Allowed | Forbidden |
|---------|-----------|
| `artifacts/{souq,api-server,mockup-sandbox}` | Business logic inside `infra/` |
| `lib/{db,api-spec,api-zod,api-client-react,object-storage-web}` | Random files at repo root |
| `infra/hetzner/` (runtime scripts; classified under **P0/P16**) | Duplicating full repos beside the monorepo without documentation |
| `docs/architecture/` (this charter + P00–P16) | Secrets in any committed file |

**Monorepo root:** `Classified-Marketplace/` — the only authoritative application tree for product code.

---

## 3. Naming rules

| Artifact | Pattern | Example |
|----------|---------|---------|
| Architecture docs | `P{NN}-{slug}.md` | `P04-listings-ads.md` |
| DB migrations (target) | `NNN_p{domain}_{desc}.sql` | `016_p5_message_indexes.sql` |
| i18n keys (target) | `p{domain}.{feature}.{key}` | `p4.ads.create.title` |
| PR title | `[P#] Short description` | `[P4] Fix ad image preload` |
| Infra scripts (target) | `p0-{action}.sh` | future rename from `phase*` |

Legacy names (`phase*`, flat i18n keys) remain on disk until a dedicated cleanup phase — map them via [README legacy table](./README.md).

---

## 4. Dependency rules

- Frontend consumes `@workspace/api-client-react` (generated) and `@workspace/api-zod` where applicable.
- API consumes `@workspace/db` (Drizzle) — no ad-hoc SQL outside migrations.
- **Generated packages** (`api-zod`, `api-client-react`) — never hand-edit; regenerate from OpenAPI.
- Artifacts must not import from sibling artifacts directly (only via `lib/*`).
- Cross-P imports in application code require explicit justification in the PR.

---

## 5. Security rules

| ID | Rule |
|----|------|
| S1 | **Never mix STAGING and PRODUCTION** credentials, refs, buckets, or deploy targets. |
| S2 | **No secrets in git** — `.env.local`, VPS `/opt/souq-arab/config/api.env`, CI secrets only. |
| S3 | **RLS required** on Supabase app tables — verify with `scripts/verify-supabase-security-readiness.sql` on STAGING first. |
| S4 | **CSRF** on user mutations; separate admin CSRF/session fields (**P2/P8**). |
| S5 | **Rate limits** at edge (Nginx, **P0/P7**) and application where needed. |
| S6 | **Protected zones** — Admin Auth, Sessions, CSRF, 2FA, Login Logic (**P2/P8**) are not changed without explicit approval and documented technical reason. |
| S7 | **No exposure** of env values, tokens, passwords, keys, or sensitive logs in docs, PRs, or chat. |

Production changes (deploy, DNS, SSL, Vercel rewrites, Railway stop) require **explicit approval from Mohamed**.

---

## 6. Deployment rules

| Environment | Rule |
|-------------|------|
| Local | Uses STAGING refs only when intentionally configured; `env-safety` guards block prod-like hosts. |
| STAGING | `qkczposlooaldmsjfmun` — all risky testing here first. |
| PRODUCTION | `nptfxtkedqndkgmrcntn` — no touch without approval. |

Flow: local test → STAGING verify → approved PRODUCTION deploy (**P0** runbooks).

---

## 7. Ownership rules

- One **primary P** per PR.
- Each P-domain has a named owner (see [README team table](./README.md)).
- Shared files (`App.tsx`, `routes/index.ts`, `lib/db/src/schema/index.ts`) — change only with coordination; route additions follow the page’s P-owner.
- `lib/db` migration author = schema-owning P (usually **P4** coordinates).

---

## 8. PR rules

1. Title: `[P#] …`
2. Description: goal, P-domain, STAGING test steps, risk, rollback plan if deploy-related.
3. CI green: typecheck, tests, `i18n:check`, build.
4. No drive-by edits outside your P without second owner approval.
5. No commit of `.env*` with real values.
6. Deploy/DNS/SSL/rewrites called out explicitly and blocked unless approved.

---

## 9. Review rules

| Change touches | Required reviewers |
|----------------|-------------------|
| P4 ads schema | P4 owner + P7 if RLS/security |
| P5 messaging / WS | P5 owner + P16 if scale-related |
| P8 admin UI | P8 owner |
| P2 auth / sessions | P2 owner + Mohamed for prod impact |
| P0 deploy / nginx | P0/P16 owner |
| `lib/db` migration | Owning P + platform |

Merge: squash to `main` after approvals; deploy is a **separate** approved step.

---

## 10. Environment isolation rules

- `MIGRATION_TARGET=staging` + `ALLOW_STAGING_MIGRATION=1` for STAGING schema pushes only.
- `artifacts/api-server/src/lib/env-safety.ts` must pass before local API starts against remote DB.
- Never copy production users/ads into STAGING.
- See [P01-environments.md](./P01-environments.md) and `docs/local-staging-isolation.md`.

---

## 11. Production protection rules

- No PRODUCTION Supabase dashboard work during STAGING-only tasks.
- No PRODUCTION env changes in Vercel/Railway without approval.
- VPS production deploy only via **P0** tagged images + health gates + rollback script.

---

## 12. i18n rules (Language Architecture)

### Official languages (current)

| Code | Language | Direction |
|------|----------|-----------|
| `ar` | Arabic | **RTL** (default) |
| `en` | English | LTR |
| `de` | German | LTR |

### Future expansion (planned)

French, Turkish, Spanish, Dutch, and others — add as locale files per P-namespace, not a single monolithic JSON.

### Mandatory rules

| Rule | Detail |
|------|--------|
| L1 | **Arabic is default** — `resolveInitialLocale()` falls back to `ar`. |
| L2 | **RTL for Arabic only** — `document.documentElement.dir` set in `artifacts/souq/src/i18n/index.ts`. |
| L3 | **All user-visible text via i18n** — no new hardcoded UI strings. |
| L4 | **P-namespace keys** — target pattern `p{domain}.{area}.{key}` (e.g. `p2.auth.login.title`). |
| L5 | **Forbidden key styles** — `text1`, `buttonText`, random opaque keys. |
| L6 | **CI** — `pnpm --filter @workspace/souq run i18n:check` must pass. |
| L7 | **Gate locales** — keep small `locales/gate/*` for LCP; full dictionaries lazy-loaded. |
| L8 | **Admin UI** — must migrate to `p8.admin.*` before adding new locales (**P8** plan). |

Legacy flat keys (`profile.*`, `ad_detail.*`) remain until **P8 / i18n migration** — do not add new flat keys for new features.

---

## 13. Anti-complexity rules

- No duplicate logic across P-domains — extract to `lib/*` only with clear ownership.
- No hidden dependencies (undocumented env vars, magic cross-imports).
- No growing god-files without a tracked split (see **P4** `create-ad.tsx`, **P5** `message-thread.tsx`).
- No guessing in production — diagnose on STAGING, document in P-domain doc.

---

## 14. Long-term scale rules

Growth path (see [P16-scale-architecture.md](./P16-scale-architecture.md)):

```
VPS → Redis → Queue → API replicas → Read replicas → Horizontal scale
```

Do not skip steps. Each layer is proven on **STAGING** before PRODUCTION.

Targets (engineering goals):

| Load | Direction |
|------|-----------|
| 1M+ ads | FTS + cache + optional dedicated search (**P14/P16**) |
| 1M+ messages/day | **P15** queue + workers |
| 1M+ notifications/day | **P15** fan-out, not synchronous API inserts |
| 10k+ concurrent WS | **P16** Redis adapter + multiple API instances |

---

## 15. Testing rules

| Layer | Requirement |
|-------|-------------|
| CI | typecheck, API unit tests, pool config, ws-url, i18n:check, frontend build |
| P-domain | Each P doc lists specific tests — run before PR |
| STAGING | Use **P1** scripts (`staging-phase1-*`) for env/RLS checks |
| Load | **P16** baseline before multi-replica prod |
| Production | No unapproved smoke against PRODUCTION |

---

## 16. Work method (mandatory)

1. **Diagnose** — identify owning P, reproduce on STAGING/local.
2. **Implement** — minimal change within P boundaries.
3. **Fix** — address root cause, not symptoms.
4. **Test** — automated + manual per P doc.
5. **Retest** — regression on adjacent P if shared files touched.
6. **Success** — criteria met on STAGING.
7. **Final report** — one report; no partial handoffs.

---

## 17. Document authority

| Document | Role |
|----------|------|
| `CONSTITUTION.md` | This file — binding rules |
| `README.md` | Official P0–P16 index and routing tables |
| `P00.md` … `P16.md` | Per-domain contracts |

When in doubt: **which P owns this?** → read that P doc → follow CONSTITUTION.

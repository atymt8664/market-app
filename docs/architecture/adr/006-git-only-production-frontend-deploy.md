# ADR-006: Git-only Production Frontend Deploy

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Date** | 2026-06-18 |
| **Deciders** | Mohamed, P0 Platform, P7 Security |
| **Primary P** | P0 |
| **Supersedes** | — (operational practice only; does not supersede ADR-000 stack) |
| **Superseded by** | — |

---

## Context

Souq Arab EU is a long-term (10–50 year) production marketplace. The approved frontend host is **Vercel** (`artifacts/souq`) per [ADR-000](./000-approved-platform-stack.md) and [CONSTITUTION.md](../CONSTITUTION.md) §6.

Production frontend deploy was historically documented via CLI upload from the developer machine:

```bash
node infra/hetzner/deploy/vercel-prod-deploy.mjs
# ≡ vercel deploy --prod --yes --archive=tgz from artifacts/souq
```

In June 2026, during a production release, this path failed: the local archive reached **~4 GB** (Vercel API `Internal Server Error`). Measured locally, `artifacts/souq` contained **~2,285 MB** on disk vs **~9 MB** of **git-tracked** source. Primary offenders: `.screenshots/` (~1.9 GB), `scripts/visual/output/` (~159 MB), local `dist/`, caches, and QA artifacts.

A **prebuilt** workaround (`vercel build --prod` + `vercel deploy --prebuilt --prod`) succeeded but was **not** in the official runbook, builds on the developer laptop, and is not SHA-bound if local tree diverges from Git.

Three parallel paths existed:

| Path | Source | Risk |
|------|--------|------|
| A | GitHub `main` → Vercel Git Integration | Clean; commit SHA identity |
| B | CLI `vercel deploy --archive=tgz` | Uploads local disk including QA junk |
| C | CLI `vercel deploy --prebuilt` | Build on developer machine |

This violates CONSTITUTION **A10** (no temporary workarounds as standard practice) and **A8** (deployments must be reversible and traceable). It also conflicts with **S7** (screenshots/logs may contain session data).

## Problem

Without a single **SSOT** deploy path:

- Production deploy can fail unpredictably when local worktrees accumulate QA output
- Deploy identity may not match a Git commit SHA
- Secrets or session data in local artifacts could be uploaded to Vercel
- Runbooks contradict each other (Git integration vs CLI archive)
- Team onboarding repeats failed patterns

## Alternatives

| Option | Pros | Cons |
|--------|------|------|
| **A — GitHub `main` → Vercel Git Integration only** | SHA-bound; clean clone; builds on Vercel; no local upload; aligns with A8/A10 | Requires disciplined commit/push; Git hook must stay connected |
| B — CLI archive + expanded `.vercelignore` | Familiar script | Deny-list is fragile; proven failure at ~4 GB; still depends on local disk |
| C — Prebuilt CLI as default | Small upload | Build on laptop; env drift; not documented as standard |
| D — Do nothing | No doc work | Recurring deploy failures and security risk |

## Decision

**Adopt Option A** as the **sole official path** for **Production** frontend deploy:

```
Local dev → tests → commit → push origin main
    → Vercel Git Integration (project: market-app-souq)
        → clone GitHub at commit SHA
        → Root Directory: artifacts/souq
        → install/build per artifacts/souq/vercel.json (monorepo via cd ../..)
        → Production alias: https://www.souq-arab.com
```

### Binding rules

1. **Every Production frontend deployment MUST map to a Git commit SHA** on `main`.
2. **Vercel builds from GitHub only** for Production — not from a developer-local archive.
3. **Prohibited for Production** (unless Emergency — below):
   - `vercel deploy --prod --archive=tgz` from a developer machine
   - `vercel deploy --prebuilt --prod` from a developer machine
   - `node infra/hetzner/deploy/vercel-prod-deploy.mjs` for Production (legacy; deprecation tracked under **P0-DG-2**)
   - Any deploy that uploads local screenshots, tmp, logs, caches, or QA output
4. **Allowed:**
   - Vercel Git Integration on `main` → Production
   - `vercel deploy` **without** `--prod` for Preview / feature branches only
5. **Emergency exception** (Production only): CLI or prebuilt allowed **only** if:
   - Vercel Git Integration is unavailable and a hotfix is urgent
   - **Explicit written approval from Mohamed**
   - Documented in a Final Report (reason, intended SHA, operator, rollback plan)
   - Git-only path restored within **24 hours** after the incident

### Security requirements

| ID | Requirement |
|----|-------------|
| SEC-1 | No secrets in Git |
| SEC-2 | No env **values** in commits |
| SEC-3 | No screenshots/logs with session cookies, tokens, or passwords in deploy context |
| SEC-4 | No local file upload to Vercel Production — GitHub is the source |
| SEC-5 | Secrets only in Vercel env, VPS protected env, Supabase dashboard |
| SEC-6 | Review `git status` before push — no accidental secret files |
| SEC-7 | Secret scan before merge to `main` (CI or manual gate until **P0-DG-3**) |
| SEC-8 | Never mix STAGING (`qkczposlooaldmsjfmun`) and PRODUCTION (`nptfxtkedqndkgmrcntn`) |
| SEC-9 | QA artifacts belong under `diagnostics/` (gitignored) — not inside `artifacts/souq` (**P0-DG-3** policy) |

### Deployment flow (Production frontend)

1. Implement and validate locally (STAGING refs only for risky testing).
2. Run P-domain validation scripts and local build (developer machine — **not** a Production deploy step).
3. Commit to `main` branch.
4. `git push origin main`.
5. Vercel Git Integration builds and deploys; record `dpl_*` and commit SHA.
6. Production verification (bundle probes, smoke scripts, visual check by Mohamed when UI changes).
7. Rollback if needed: Vercel **Promote** previous deployment and/or `git revert` + push.

### Rollback

| Layer | Action |
|-------|--------|
| **Immediate** | Vercel Dashboard → Promote previous Production deployment (`dpl_*`) |
| **Code** | `git revert <sha>` → push `main` → Vercel rebuilds from Git |
| **Verify** | Smoke scripts + bundle markers on `www.souq-arab.com` |

### Relationship to API deploy

This ADR covers **frontend (Vercel) only**. API deploy remains tagged Docker images on Hetzner VPS per [P00](../P00-infrastructure.md) and `infra/hetzner/deploy/DEPLOY.md` (A8 — never `scp` application source).

## Cost

- **$0** incremental — uses existing Vercel Git Integration
- Follow-on engineering under **P0 Deployment Governance** sub-phases (see Implementation notes)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Team uses deprecated CLI runbook | Medium | **P0-DG-1** runbooks; **P0-DG-2** script guard |
| Git Integration misconfigured | Low | **P0-DG-4** verification deploy; dashboard checklist |
| Hotfix blocked during Git outage | Low | Documented Emergency exception + 24h restore |
| QA junk returns under `artifacts/souq` | High without **P0-DG-3** | `diagnostics/` policy + `.gitignore` |
| iOS/PWA push unaffected | — | Out of scope — notification ADRs unchanged |

## Rollback Plan (if this ADR fails as policy)

1. Mark ADR-006 **Deprecated**; supersede with new ADR if a different SSOT is required.
2. Do **not** revert to undocumented CLI archive without ADR.
3. Restore last known-good Vercel deployment via dashboard.

## Scalability Impact

| Load | Effect |
|------|--------|
| 100k–10M users | Git-only deploy scales operationally — Vercel builders handle parallelism; no change to runtime architecture |
| Team growth | Single SSOT reduces onboarding errors and deploy incidents |

Per CONSTITUTION A4: deploy path must not become a bottleneck at scale — Git + Vercel is the standard pattern for this stack.

## Security Impact

- **S1–S2:** Reinforces no secrets in git; deploy source is GitHub tracked files only
- **S7:** Reduces risk of uploading local screenshots/logs containing credentials
- **Production approval:** Mohamed approval still required for Production **releases** per CONSTITUTION §6; this ADR defines **how**, not **when**

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product / Founder | Mohamed | 2026-06-18 | **Approved** |
| P0 / Platform | — | 2026-06-18 | Documented |
| P7 Security | — | 2026-06-18 | Reviewed |

---

## Implementation notes (post-acceptance)

Tracked in [PROJECT_STATE.md](../../PROJECT_STATE.md) under **P0 — Deployment Governance (ADR-006)**. Sub-phases follow the project Sub-Phase convention (inside builder **P0**, not a parallel roadmap).

| Sub-Phase | Scope | Status |
|-----------|-------|--------|
| **P0-DG-0** | ADR-006 draft | ✅ Closed |
| **P0-DG-1** | Docs / runbooks / PROJECT_STATE / P00 | ✅ Closed — [P0-production-frontend-deploy.md](../../runbooks/P0-production-frontend-deploy.md) |
| **P0-DG-2** | Deploy guards; deprecate `vercel-prod-deploy.mjs` | ✅ Closed |
| **P0-DG-3** | QA artifact policy; `.gitignore` | ⏳ Not opened |
| **P0-DG-4** | Production verification on next Git-only frontend deploy | ⏳ Not opened |
| **P0-DG-5** | Closure report + PCL | ⏳ Not opened |

**Official runbook:** [P0-production-frontend-deploy.md](../../runbooks/P0-production-frontend-deploy.md)

**Supersedes operational guidance in:** [P17-5-7-production-deploy.md](../../runbooks/P17-5-7-production-deploy.md) §2 (frontend section only — API sections unchanged).

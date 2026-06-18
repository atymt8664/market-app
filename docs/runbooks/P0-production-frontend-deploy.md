# P0 — Production Frontend Deploy (Git-only)

**Authority:** [ADR-006: Git-only Production Frontend Deploy](../architecture/adr/006-git-only-production-frontend-deploy.md)  
**Primary P:** P0  
**Scope:** Vercel Production frontend only (`market-app-souq` → `https://www.souq-arab.com`)

**Not in scope:** API / VPS deploy — see `infra/hetzner/deploy/DEPLOY.md` and feature runbooks (e.g. [P17-5-7-production-deploy.md](./P17-5-7-production-deploy.md) §3).

---

## Environment refs (never mix)

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## SSOT deploy path

**The only official Production frontend deploy path:**

```
git commit on main → git push origin main → Vercel Git Integration → Production
```

Every Production deployment **must** be identifiable by:

- **Git commit SHA** on `main`
- **Vercel deployment ID** (`dpl_*`)

---

## Prerequisites

| Item | Requirement |
|------|-------------|
| **Vercel project** | `market-app-souq` (not `classified-marketplace`) |
| **Production URL** | `https://www.souq-arab.com` |
| **Root Directory** | `artifacts/souq` (Vercel project setting) |
| **Git branch** | `main` connected to Production |
| **Mohamed approval** | Required before Production release (CONSTITUTION §6) |
| **ADR-006** | **Accepted** before treating this runbook as binding |

---

## Pre-push (local — not a deploy)

Run on the developer machine **before** commit/push. This validates code; it does **not** deploy Production.

```bash
pnpm run typecheck
pnpm --filter @workspace/souq run build
pnpm --filter @workspace/souq run i18n:check
# P-domain validation scripts as required by the change (P9, P17, chat, etc.)
```

### Security checklist (mandatory)

- [ ] `git status` — no `.env`, credentials, or token files staged
- [ ] No secrets in commit message or diff
- [ ] No screenshots or logs with session data committed
- [ ] Local QA output stays **untracked** (future: `diagnostics/` per ADR-006 **P0-DG-3**)
- [ ] STAGING and PRODUCTION refs not mixed in local env files

---

## Production deploy steps

### 1. Commit

```bash
git checkout main
git pull origin main
# implement + validate locally
git add <tracked files only>
git commit -m "[P#] description"
```

### 2. Push

```bash
git push origin main
```

### 3. Vercel Git build

Vercel automatically:

1. Clones GitHub at the pushed commit SHA
2. Uses Root Directory `artifacts/souq`
3. Runs `installCommand` / `buildCommand` from `artifacts/souq/vercel.json` (monorepo via `cd ../..`)
4. Publishes `dist/` to Production when the Production branch hook fires

**Do not** run `vercel deploy --prod` from a laptop for Production.

### 4. Record deployment

From Vercel dashboard or CLI (read-only inspect):

- Deployment ID: `dpl_*`
- Commit SHA
- Production URL: `https://www.souq-arab.com`

### 5. Production verification

Run scripts appropriate to the change, for example:

```bash
pnpm --filter @workspace/souq run p17-prod3:prod   # when P17 surfaces touched
pnpm --filter @workspace/souq run p17:prod
# P-domain validation scripts (validate-p9-*, chat static, etc.)
```

Manual: Mohamed visual check on phone when UI changes.

---

## Production environment variables

Set in **Vercel dashboard** (Production environment) — never commit values.

| Variable | Notes |
|----------|-------|
| `VITE_*` flags | Baked at build time — changing requires a new Git deploy |
| API URLs | Must point to Production API only |

After env change: push an empty commit or use Vercel **Redeploy** on the latest `main` commit (still Git-sourced).

---

## Rollback

| Priority | Action |
|----------|--------|
| **1 — Fastest** | Vercel Dashboard → Deployments → select previous `dpl_*` → **Promote to Production** |
| **2 — Code** | `git revert <sha>` → `git push origin main` → Vercel rebuilds from Git |
| **3 — Verify** | Bundle probes + smoke scripts on `www.souq-arab.com` |

---

## Prohibited for Production

| Action | Reason |
|--------|--------|
| `vercel deploy --prod --archive=tgz` | Uploads local disk; caused ~4 GB failure |
| `vercel deploy --prebuilt --prod` | Builds on developer machine; not SHA SSOT |
| `node infra/hetzner/deploy/vercel-prod-deploy.mjs` | **Blocked** by P0-DG-2 — exits 1; use Git push |
| `vercel deploy --prod` without Git push | No commit identity |
| Deploy project `classified-marketplace` | Wrong project — alias is `market-app-souq` only |

---

## Emergency exception

Use **only** when Vercel Git Integration is unavailable and Mohamed has given **explicit written approval**.

Set env (shell session only — **never commit**):

```bash
export SOUQ_EMERGENCY_FRONTEND_DEPLOY_APPROVED=1
export SOUQ_EMERGENCY_FRONTEND_DEPLOY_REASON="incident summary + intended commit SHA"
```

Then run **one** mode from monorepo root:

```bash
# Last resort — local archive upload (blocked by default path)
node infra/hetzner/deploy/vercel-prod-emergency.mjs --archive

# Last resort — local prebuilt upload
node infra/hetzner/deploy/vercel-prod-emergency.mjs --prebuilt
```

Requirements after emergency deploy:

1. Final Report within 24h
2. Restore Git-only path
3. Close exception in PROJECT_STATE notes if needed

**Blocked without env approval:**

```bash
node infra/hetzner/deploy/vercel-prod-deploy.mjs   # exits 1 — use Git push instead
```

---

## Preview deploys (non-Production)

Preview deployments from feature branches may use Vercel Preview URLs. Still prefer Git integration. Local `vercel deploy` **without** `--prod` is for experiments only — not Production.

---

## Related

- [ADR-006](../architecture/adr/006-git-only-production-frontend-deploy.md)
- [ADR-000](../architecture/adr/000-approved-platform-stack.md)
- [P17-5-7-production-deploy.md](./P17-5-7-production-deploy.md) — commerce + API sections
- [PROJECT_CONSTITUTION.md](../PROJECT_CONSTITUTION.md)

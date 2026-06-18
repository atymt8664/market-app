# P0 — Infrastructure & Hosting

| Field | Value |
|-------|-------|
| **Code** | P0 |
| **Status** | Active |

---

## الهدف / Goal

Provide reliable **runtime hosting** for the API (Hetzner VPS, Docker, Nginx) and **documented Production frontend deploy** (Vercel Git-only per ADR-006), plus DNS/TLS (when approved), deploy/rollback, health checks, and Railway fallback documentation — without owning product business logic.

---

## المسؤوليات / Responsibilities

- VPS bootstrap and directory layout (`/opt/souq-arab/`)
- Nginx reverse proxy, rate-limit zones, TLS termination (when approved)
- Docker Compose profiles (staging, production, readiness stub)
- Tagged image deploy, rollback, verify scripts
- Post-cutover stabilization and production shadow workflows
- Operational runbooks and logs paths

---

## الملفات التابعة / Owned paths

| Area | Paths |
|------|-------|
| Foundation | `infra/hetzner/vps-foundation/` |
| API readiness | `infra/hetzner/api-readiness/` |
| Deploy (API) | `infra/hetzner/deploy/` (`deploy-api.sh`, `rollback-api.sh`, `verify-deploy.sh`, `DEPLOY.md`) |
| Deploy (frontend SSOT) | [ADR-006](./adr/006-git-only-production-frontend-deploy.md) · [P0-production-frontend-deploy.md](../runbooks/P0-production-frontend-deploy.md) |
| Milestones (legacy names) | `infra/hetzner/phase1-stabilization/` … `phase8/` |
| Root deploy config | `vercel.json` (hosting headers only — **rewrites require Mohamed approval**) · `artifacts/souq/vercel.json` (build/install for Vercel) |
| Helpers | `scripts/phase3-vps-apply.ps1`, `phase4-vps-apply.ps1`, `phase5-dns-and-cutover.ps1` |

---

## ما المسموح تعديله / Allowed changes

- Shell/PowerShell deploy and verify scripts
- Nginx snippets and compose files
- Health-check URLs and deploy logging
- Documentation in this P-domain

---

## ما الممنوع تعديله / Forbidden changes

- Express routes, Drizzle schema, React pages
- Committed secrets or production env values
- DNS, SSL, Vercel rewrites, Railway stop **without Mohamed approval**
- PRODUCTION Supabase or deploy without explicit approval

---

## Boundaries

- **In scope:** HTTP/WS reachability, containers, edge proxy, deploy safety
- **Out of scope:** Auth rules (P2), ads (P4), chat protocol (P5), search (P14)

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P1** | Env files on VPS (`api.env`) |
| **P13** | Monitor snapshots, log paths |

| Used by | Reason |
|---------|--------|
| All P | Runtime |

---

## Owner scope

- **Primary:** Platform / DevOps (**Developer E** for cutover & scale coordination)
- **Approves:** Production deploy, DNS, TLS changes (Mohamed)

---

## Production frontend deploy (Vercel)

**SSOT:** [ADR-006](./adr/006-git-only-production-frontend-deploy.md) — GitHub `main` → Vercel Git Integration → Production.

| Rule | Detail |
|------|--------|
| Official path | `git push origin main` — Vercel builds from GitHub at commit SHA |
| Prohibited (Production) | CLI `vercel deploy --prod --archive=tgz`, prebuilt CLI deploy, local archive upload |
| Runbook | [P0-production-frontend-deploy.md](../runbooks/P0-production-frontend-deploy.md) |
| Legacy script | `infra/hetzner/deploy/vercel-prod-deploy.mjs` — **blocked** (**P0-DG-2**) · emergency: `vercel-prod-emergency.mjs` |
| Emergency | ADR-006 exception only with Mohamed approval |

Frontend deploy does **not** use developer-local files as the upload source. Secrets stay in Vercel env — never in git.

## Scalability notes

- Single API container today; Nginx upstream prepared for **API-2/3** (**P16**)
- Edge rate limits: see `infra/hetzner/phase3-hardening/nginx/souq-phase3-limits.conf`
- Never `scp` source — tagged images only (API)

---

## Future roadmap

- Rename `infra/hetzner/phase*` → `p0-milestones/` (folder rename phase — not done yet)
- Multi-region CDN for API static assets (if needed)
- Infrastructure-as-code evaluation (long-term)

---

## Testing requirements

- `infra/hetzner/deploy/verify-deploy.sh` — `/healthz`, `/api/healthz`, `/api/readyz`
- STAGING: scripts under `phase4-staging-smoke.sh`, `phase5-ws-probe.sh`, `verify-phase5.sh`
- No PRODUCTION deploy tests without approval

---

## Security notes

- Secrets only on VPS `chmod 600` env files
- fail2ban / nginx limits coordinated with **P7**
- No secret output in verify scripts

---

## Related legacy phase paths

| Legacy | Role |
|--------|------|
| `vps-foundation/` | Bootstrap |
| `api-readiness/` | Hybrid API readiness (legacy “Phase 2”) |
| `phase1-stabilization/` | STAGING stabilization |
| `phase2-tail/` | Env/storage tail |
| `phase3/`, `phase3-hardening/` | Upstream + hardening |
| `phase4/` | HTTPS + staging smoke |
| `phase5/` | API cutover + baseline |
| `phase6/` | Stabilization + monitor + image prep |
| `phase7/`, `phase8/` | Prod shadow + release |

---

## i18n namespace

N/A (no user-facing strings). Operational logs in English.

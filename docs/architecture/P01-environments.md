# P1 — Environment Management

| Field | Value |
|-------|-------|
| **Code** | P1 |
| **Status** | Active |

---

## الهدف / Goal

Guarantee **strict isolation** between Local, STAGING, and PRODUCTION — correct Supabase refs, safe migrations, and guards against accidental production access.

| Environment | Supabase ref |
|-------------|--------------|
| STAGING | `qkczposlooaldmsjfmun` |
| PRODUCTION | `nptfxtkedqndkgmrcntn` |

---

## المسؤوليات / Responsibilities

- `.env.example` / `.env.local.example` templates
- `env-safety.ts` startup guards
- Migration safety (`db:push:staging:safe`, `MIGRATION_TARGET`, `ALLOW_STAGING_MIGRATION`)
- STAGING verification scripts
- Seed policy (no prod data copy)
- Documenting required env vars per artifact

---

## الملفات التابعة / Owned paths

| Path | Purpose |
|------|---------|
| `docs/local-staging-isolation.md` | Runbook |
| `artifacts/api-server/.env.example`, `.env.local.example` | API template |
| `artifacts/souq/.env.local.example` | Frontend template |
| `artifacts/api-server/src/lib/env-safety.ts` | Guards |
| `scripts/staging-phase1-local-verify.mjs` | Local CI-style verify |
| `scripts/staging-phase1-supabase-verify.mjs` | STAGING RLS/storage |
| `scripts/staging-phase2-tail-verify.ps1` | Tail checks |
| Root `package.json` → `db:push:staging:safe` | Safe migration entry |

---

## ما المسموح تعديله / Allowed changes

- Guard patterns, blocked host lists (no real secrets in repo)
- STAGING verify scripts and runbooks
- Example env keys (names only)

---

## ما الممنوع تعديله / Forbidden changes

- Production `DATABASE_URL` or keys in any committed file
- Disabling guards to “make local work” against PRODUCTION
- Importing production users/ads into STAGING

---

## Boundaries

- **In scope:** Which env is active, whether an operation is allowed
- **Out of scope:** Business features, deploy mechanics (**P0**)

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | VPS env file location |

| Used by | Reason |
|---------|--------|
| All P | Every feature runs in an environment |

---

## Owner scope

- **Primary:** Platform lead
- **Consulted:** Any P adding a new required env var

---

## Scalability notes

- Future: central `ENV_REGISTRY.md` listing var → P-owner
- Secrets manager (Vault) for multi-region — long-term

---

## Future roadmap

- Automated STAGING seed (categories, test admin only)
- CI check: new env var must be registered under P1

---

## Testing requirements

- `node scripts/staging-phase1-local-verify.mjs`
- `node scripts/staging-phase1-supabase-verify.mjs` against STAGING only
- API start must fail if env looks like PRODUCTION in dev

---

## Security notes

- **P1 cleanup (2026):** `scripts/exports/` must never be in git (user data). Legacy `api-build-slim*` trees archived under workspace `_SECURITY_ARCHIVE/`. Cutover scripts require `SOUQ_CUTOVER_APPROVED=1`.
- **Never mix** STAGING and PRODUCTION refs in one `.env.local`
- `ALLOW_REMOTE_DB_IN_DEV=1` only when intentional STAGING use
- No secrets in git diff or documentation

---

## Related legacy phase paths

| Legacy | Maps to P1 |
|--------|------------|
| `phase1-stabilization/` (STAGING criteria) | Verification checklist |
| `phase2-tail/` | STAGING env/storage checks |
| `scripts/staging-phase1-*`, `staging-phase2-tail-*` | Official STAGING verify |

---

## i18n namespace

N/A. Error messages from guards are developer-facing (English).

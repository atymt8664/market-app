# Souq Arab EU — Project Constitution (entry point)

**Binding engineering charter:** [architecture/CONSTITUTION.md](./architecture/CONSTITUTION.md)

**Operational phase tracker:** [PROJECT_STATE.md](./PROJECT_STATE.md)

**P-domain index:** [architecture/README.md](./architecture/README.md)

---

## Non-negotiables

- Production-first · Scalable · Maintainable · Reversible · No regression
- One open builder phase at a time (see PROJECT_STATE)
- Never mix STAGING (`qkczposlooaldmsjfmun`) and PRODUCTION (`nptfxtkedqndkgmrcntn`)
- No secrets in git, docs, or chat
- Work method: Diagnose → Root Cause → Minimal Fix → Test → Retest → Production Verification → Final Report

---

## Approved stack

| Layer | Technology |
|-------|------------|
| Frontend | Vercel (`artifacts/souq`) |
| Backend | Hetzner VPS (`artifacts/api-server`) |
| Database + Storage | Supabase Pro |
| Realtime | WebSocket |
| Railway | Legacy / fallback only |

Production deploy, DNS, SSL, and environment changes require **explicit approval from Mohamed**.

---

*This file is the docs-root pointer. All rule detail lives in architecture/CONSTITUTION.md.*

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
- Work method: see **Workflow** below — no partial handoffs; one Final Report per completed task

---

## Approved stack

| Layer | Technology |
|-------|------------|
| Frontend | Vercel (`artifacts/souq`) |
| Backend | Hetzner VPS (`artifacts/api-server`) |
| Database + Storage | Supabase Pro |
| Realtime | WebSocket |
| Railway | Legacy / fallback only |

---

## Workflow (Execution & Release Governance)

**SSOT for agent execution and release policy.** P-domain, security, and deployment detail remain in [architecture/CONSTITUTION.md](./architecture/CONSTITUTION.md) — this section governs *how* work runs and *when* it may ship.

**Orchestration:** **Production Engineer** is the default orchestrator. **Final Skill Architecture v1.0** applies for routing (simple vs specialist playbooks). Specialists are invoked only when evidence requires them — not by default.

### Mandatory work chain

Every completed task follows this chain end-to-end (no skipped steps):

```
Diagnose → Root Cause → Minimal Safe Fix → Test → Retest → Verification → Final Report
```

Aligns with [architecture/CONSTITUTION.md §16](./architecture/CONSTITUTION.md#16-work-method-mandatory); this entry-point section adds execution gates and release policy below.

### Execution Decision Policy

When diagnosis confirms **all** of the following:

- Root cause is clear
- Minimal Safe Fix is clear
- No architectural change
- No runtime / infrastructure change
- No database change
- No API contract change
- No scope expansion
- No project-owner decision required

the agent **must complete the full mandatory work chain** in one pass — including fix, test, retest, verification, and Final Report.

**Forbidden:** stopping after diagnosis with an intermediate report and waiting for re-approval to implement an already-clear, in-scope fix.

### Owner Decision Gate

When diagnosis finds **any** of the following, the agent **stops after diagnosis** and requests an explicit decision from the **project owner (Mohamed)** before implementation:

- More than one valid design or approach
- Architectural decision
- Long-term / structural change
- Scope expansion beyond the stated task
- Uncertain or unverified risk
- Conflicting solutions
- Likely impact on Production (behavior, data, auth, deploy path, or public URLs)

Provide: root cause summary, options (if any), recommended Minimal Safe Fix, and what is blocked pending approval.

### Release Approval Policy

**Regardless of test results** — including full PASS on local, STAGING, or Production verification — the agent **must not** perform any of the following without **explicit project-owner approval**:

- Commit
- Push
- Deploy
- Release
- Publish

This policy applies even when the Owner Decision Gate did not block implementation (fix may be completed and verified locally; shipping remains gated).

Production deploy, DNS, SSL, and environment changes remain additionally governed by [architecture/CONSTITUTION.md §5–§6](./architecture/CONSTITUTION.md#5-security-rules) and [§8 PR rules](./architecture/CONSTITUTION.md#8-pr-rules).

### Final Report Policy

Every completed fix or verification task ends with **one** Final Report (no interim “done, waiting for commit” substitutes).

**Minimum required sections:**

| Section | Content |
|---------|---------|
| **Root Cause** | What failed and why |
| **Routing Decision** | Orchestrator path; specialists invoked (or none) and why |
| **Files Modified** | Exact paths touched |
| **Tests Performed** | What was run and where |
| **Verification** | Environments / URLs / scenarios checked |
| **PASS / FAIL** | Outcome with brief reason |
| **Rollback Plan** | How to revert safely |

Phase handoffs, audits, and architecture reviews that close or open builder phases **also** include **Phase Continuity Lock (PCL)** per [PROJECT_STATE.md](./PROJECT_STATE.md) and [_TEMPLATE-final-report.md](./runbooks/_TEMPLATE-final-report.md) — in addition to the minimum sections above when applicable.

---

## Document authority (this file)

| Topic | SSOT |
|-------|------|
| Execution workflow · release gates · Final Report minimum | **This file** (`PROJECT_CONSTITUTION.md`) |
| P-domain rules · security · deployment · i18n · PR conventions | [architecture/CONSTITUTION.md](./architecture/CONSTITUTION.md) |
| Open phase · milestones · PCL handoffs | [PROJECT_STATE.md](./PROJECT_STATE.md) |

When in doubt: read this file first → PROJECT_STATE → owning P-domain doc → architecture/CONSTITUTION for rule detail.

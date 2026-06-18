# ADR-NNN: {Title}

| Field | Value |
|-------|-------|
| **Status** | Proposed \| Accepted \| Rejected \| Deprecated \| Superseded |
| **Date** | YYYY-MM-DD |
| **Deciders** | Mohamed, {P-owner}, {reviewers} |
| **Primary P** | P{n} |
| **Supersedes** | ADR-XXX (optional) |
| **Superseded by** | ADR-YYY (optional) |

---

## Context

What is the current state? What constraints apply (CONSTITUTION, ADR-000, owning P)?

## Problem

What problem are we solving? What fails or becomes unacceptable without this decision?

## Alternatives

| Option | Pros | Cons |
|--------|------|------|
| A — {recommended or chosen} | | |
| B | | |
| C — do nothing | | |

## Decision

What did we decide? Why this option over the others?

## Cost

- Monthly infrastructure cost (estimate)
- Engineering cost (one-time + ongoing)
- Vendor lock-in risk

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|

## Rollback Plan

How do we revert within 24h / 7d if the decision fails in production?

## Scalability Impact

Expected behavior at 100k / 1M / 10M users or entities (CONSTITUTION A4).

## Security Impact

PII, secrets, RLS, STAGING/PROD isolation (CONSTITUTION S1–S7). No secrets in this file.

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product / Founder | Mohamed | | Approved / Rejected |
| P-owner | | | Reviewed |
| Security (if applicable) | P7 | | Reviewed |

---

## Implementation notes (post-acceptance only)

- PRs:
- Env vars: (names only — no values)
- PROJECT_STATE milestone:
- Annex updates (if any):

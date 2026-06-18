# Architecture Decision Records (ADR)

**Status:** Official governance — adopted P17-9-0A  
**Authority:** [PROJECT_CONSTITUTION.md](../../PROJECT_CONSTITUTION.md) · [CONSTITUTION.md](../CONSTITUTION.md)

---

## ADR Purpose

ADRs document **significant architectural decisions** — especially those that introduce vendors, change the approved platform stack, or alter cross-cutting system behavior.

Goals:

- Prevent undocumented adoption of external services (Firebase, OneSignal, Pusher, payment/shipping providers, etc.)
- Provide a single index of **Accepted** decisions with status lifecycle
- Enable PRs to reference `ADR-NNN` explicitly
- Support rollback and supersession without re-litigating closed decisions

**ADRs are not builder P-domains.** They do not open phases in `PROJECT_STATE.md`. Implementation still ships under `[P#]` PR tags.

---

## ADR Lifecycle

```
1. Trigger — change requires ADR (see Governance Rules)
        ↓
2. Author drafts docs/architecture/adr/NNN-{slug}.md using _TEMPLATE.md
   Status: Proposed
        ↓
3. Architecture Review — owning P + P0 (if infra) + P7 (if security)
        ↓
4. STAGING impact documented (if runtime change planned)
        ↓
5. Mohamed approval → Status: Accepted
        ↓
6. Update this README index
        ↓
7. Implementation PR: "Implements ADR-NNN"
        ↓
8. If decision changes later → new ADR; mark old as Superseded
```

---

## ADR Statuses

| Status | Meaning |
|--------|---------|
| **Proposed** | Under review — not binding |
| **Accepted** | Approved — binding for implementation |
| **Rejected** | Declined — retained in index for history |
| **Deprecated** | No longer recommended; not yet replaced |
| **Superseded** | Replaced by a newer ADR (`Superseded by: ADR-NNN`) |

**Transitions:** Proposed → Accepted \| Rejected · Accepted → Deprecated \| Superseded · Deprecated → Superseded

---

## ADR Numbering Rules

| Rule | Detail |
|------|--------|
| Format | `NNN-{kebab-slug}.md` — e.g. `012-external-push-provider.md` |
| Title | `ADR-NNN: {Short title}` |
| Sequence | Global monotonic integers — **no gaps reused** |
| ADR-000 | Reserved for baseline platform stack (retroactive Accepted) |
| P-domain ADRs | Same global sequence — not per-P numbering |

---

## ADR Approval Rules

| Requirement | Detail |
|-------------|--------|
| **Accepted** | Requires explicit approval from **Mohamed** |
| **Proposed → Accepted** | Architecture Review complete; alternatives documented |
| **Security-affecting** | P7 reviewer sign-off in Approval table |
| **Infra / deploy** | P0 awareness; no PRODUCTION change from docs-only ADR |
| **Rejected** | Mohamed or Architecture Review — reason recorded |

---

## ADR Governance Rules

### ADR is **mandatory** before implementation when:

- Adding any **external service or vendor** (including free tier)
- Changing **database**, **storage**, or **hosting** provider
- Adding **realtime**, **push**, or **notification** infrastructure outside approved stack
- Adding **payment**, **shipping**, or **SMS** provider
- **Redis cluster** or managed Redis **outside** VPS loopback
- **Cloudflare Enterprise** or major CDN replacement
- Multi-region / Kubernetes / structural **VPS architecture** change
- **Breaking API** at platform scale (with Schema Council)
- Opening a new **builder P-number** (C1–C5) — ADR may complement A11 review

### ADR is **not required** for:

- Bug fixes, UI/CSS polish, i18n text
- Features within an **Accepted** ADR and Architecture Lock (e.g. new `order.*` notification type)
- Migrations on **same** Supabase Pro within approved stack
- Performance tuning within existing stack

### PR discipline

- Implementation PRs reference: `Implements ADR-NNN`
- No vendor SDK, env var, or DNS for external service without **Accepted** ADR
- Rejected ADRs are **never deleted** from the index

---

## Relationship with Constitution

| Document | Role |
|----------|------|
| [CONSTITUTION.md](../CONSTITUTION.md) | Binding engineering charter — stable rules |
| **ADR** | Point-in-time decisions; may supersede earlier ADR, not Constitution |
| [PROJECT_CONSTITUTION.md](../../PROJECT_CONSTITUTION.md) | Entry pointer — approved stack summary |

Constitution changes require charter amendment. Stack exceptions require **new ADR** + Mohamed approval, not informal overrides.

---

## Relationship with Annexes

| Artifact | Role |
|----------|------|
| [Annex](../annex/README.md) | Ongoing **operational contract** (notification deep links, schema council, design tokens) |
| **ADR** | **Decision record** that may *motivate* annex updates |

If an Accepted ADR changes cross-cutting behavior, update the relevant Annex in the **same docs PR**.

---

## Relationship with PROJECT_STATE

| Item | Rule |
|------|------|
| ADR framework (P17-9-0A) | Sub-Phase under P17 — tracked in PROJECT_STATE |
| Individual ADRs | **Do not** open builder phases |
| Implementation milestones | Sub-Phases (e.g. P17-9-1) reference ADRs in Notes column |

---

## ADR Index

| ADR | Title | Status | Primary P | Notes |
|-----|-------|--------|-----------|-------|
| [000](./000-approved-platform-stack.md) | Approved Platform Stack | **Accepted** | P0 | Vercel · Hetzner VPS · Supabase Pro |
| [006](./006-git-only-production-frontend-deploy.md) | Git-only Production Frontend Deploy | **Accepted** | P0 | SSOT: GitHub `main` → Vercel Git Integration · [P0 runbook](../../runbooks/P0-production-frontend-deploy.md) · Mohamed approved 2026-06-18 |
| 001 | Queue Phase 1: PostgreSQL + pg-boss | **Accepted** | P15 | Canonical text: [P15-background-jobs.md](../P15-background-jobs.md#adr-001--queue-phase-1-postgresql--pg-boss) — migrate to `adr/` in future task |
| 002 | Queue Phase 2: BullMQ + Redis (conditional) | **Accepted** | P15 | [P15 § ADR-002](../P15-background-jobs.md#adr-002--queue-phase-2-bullmq--redis-conditional) |
| 003 | Worker host: same VPS initially | **Accepted** | P15 | [P15 § ADR-003](../P15-background-jobs.md#adr-003--worker-host-same-vps-initially) |
| 004 | Transactional outbox pattern | **Accepted** | P15 | [P15 § ADR-004](../P15-background-jobs.md#adr-004--transactional-outbox-pattern) |
| 005 | Environment isolation (jobs) | **Accepted** | P15 | [P15 § ADR-005](../P15-background-jobs.md#adr-005--environment-isolation) |

**Template:** [_TEMPLATE.md](./_TEMPLATE.md)

---

## Related

- [Notification Architecture Lock](../annex/notification-contract.md) — in-app / push boundaries
- [P15 Background Jobs](../P15-background-jobs.md) — queue ADRs 001–005 source
- [Schema Council](../annex/schema-council.md) — DB/API changes

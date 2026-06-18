# ADR-000: Approved Platform Stack

| Field | Value |
|-------|-------|
| **Status** | **Accepted** (retroactive baseline — 2026-06-10) |
| **Date** | 2026-06-10 |
| **Deciders** | Mohamed (approved via P17-9-0A) |
| **Primary P** | P0 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## Context

Souq Arab EU is a long-term (10–50 year) marketplace platform. The project charter ([PROJECT_CONSTITUTION.md](../../PROJECT_CONSTITUTION.md), [CONSTITUTION.md](../CONSTITUTION.md)) defines an approved technology stack. All product systems — including notifications, realtime, queues, badges, digests, and admin workflows — must operate on this stack unless a future ADR proves hard technical necessity.

This ADR retroactively formalizes the baseline stack and vendor prohibition rules adopted before P17-9 notification implementation.

## Problem

Without a single **Accepted** ADR for the platform stack:

- External vendors (Firebase, OneSignal, Pusher, etc.) could be introduced ad hoc
- Notification and chat architecture could drift to paid SaaS dependencies
- Rollback and governance lack a canonical decision reference

## Alternatives

| Option | Pros | Cons |
|--------|------|------|
| **A — Vercel + Hetzner VPS + Supabase Pro only** | Single cost model; full control; aligns with monorepo; no vendor lock for messaging | Self-operate scale path (P15/P16) |
| B — Add Firebase/FCM for push | Familiar mobile push | External vendor; violates minimal stack; TWA/PWA can use Web Push |
| C — Add Pusher/Ably for realtime | Managed realtime | External vendor; WebSocket on VPS already approved |
| D — Managed queue SaaS (SQS, etc.) | Hands-off scaling | Extra vendor; pg-boss on Supabase already Accepted (ADR-001) |

## Decision

**Adopt Option A** as the sole approved platform stack:

| Layer | Technology | Path / notes |
|-------|------------|--------------|
| **Frontend** | **Vercel** | `artifacts/souq` — PWA/TWA, Service Worker, UI |
| **Backend API + workers** | **Hetzner VPS** | `artifacts/api-server` — REST, WebSocket, Web Push VAPID, pg-boss workers, Redis loopback |
| **Database + Storage** | **Supabase Pro** | Postgres, RLS, object storage |
| **Realtime** | **WebSocket on VPS** | Not Supabase Realtime, not Pusher/Ably |
| **Push (user)** | **Web Push VAPID** on VPS + SW on Vercel | Not FCM/Firebase |
| **Job queue** | **pg-boss on Supabase** | ADR-001; Redis loopback on VPS for push delivery path only |
| **Railway** | Legacy / fallback only | Not primary |

### Prohibited without a new Accepted ADR

| Category | Examples |
|----------|----------|
| Push / notification SaaS | **Firebase**, **FCM**, **OneSignal**, any paid messaging hub |
| Realtime SaaS | **Pusher**, **Ably**, Supabase Realtime as WS replacement |
| External notification infrastructure | Third-party fan-out, external ESP as primary |
| New vendors generally | Payment providers, shipping APIs, SMS gateways, analytics SaaS not yet Approved |
| Managed Redis **outside** VPS | ElastiCache, Upstash cluster, Redis Cloud |
| **Cloudflare Enterprise** | Unless ADR proves necessity |
| Frontend/API hosting change | Non-Vercel frontend, non-VPS API primary |

### Allowed within this ADR (no additional ADR)

- Bug fixes, features, and migrations on the approved stack
- Redis **loopback** on VPS (push queue — ADR-002 conditional path)
- SMTP from VPS for security email (internal job — external ESP requires ADR)
- Supabase scaling tiers within Supabase Pro
- VPS horizontal scaling documented under P16 (may trigger ADR-00N for replicas)

### Exception process

Any prohibited item requires:

1. New ADR in `docs/architecture/adr/` — Status **Proposed**
2. Documented **hard technical necessity** (metrics, device matrix, failure proof)
3. Alternatives on approved stack exhausted
4. **Mohamed** approval → **Accepted**
5. Update this index and relevant Annex if cross-cutting

## Cost

- **Vercel** — hosting per plan
- **Hetzner VPS** — fixed server cost
- **Supabase Pro** — DB + storage subscription
- **No per-message SaaS** for notifications on baseline stack
- Engineering: operate queue/WS/push in-house (P15, P11, P16)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| iOS PWA push limitations | Medium | Device testing; native app = separate ADR |
| VPS single-host limits | Medium | P16 scale path; ADR for replicas when triggered |
| Team temptation to add SaaS | Medium | This ADR + PR review + G-ADR rules |
| Web Push deliverability | Low–Medium | P17-9 STAGING device matrix |

## Rollback Plan

This ADR **is** the baseline — rollback means superseding with ADR-NNN, not reverting to informal stack. If a new vendor ADR is Accepted and fails:

1. Disable vendor integration via feature flag
2. Revert to VAPID/VPS/Supabase path per notification architecture
3. Mark failed vendor ADR **Deprecated**; restore ADR-000 supremacy

## Scalability Impact

| Load | Direction on approved stack |
|------|------------------------------|
| 100k users | Single VPS + Supabase Pro sufficient |
| 1M users | pg-boss fan-out; WS Redis adapter (P16); read tuning |
| 10M users | API replicas, partition, dedicated workers — each step via ADR when triggered |

Per CONSTITUTION A4: state behavior at 1M+ before merge of scale-affecting changes.

## Security Impact

- **S1:** STAGING (`qkczposlooaldmsjfmun`) and PRODUCTION (`nptfxtkedqndkgmrcntn`) never mixed
- **S2:** No secrets in ADR files or git
- **S3:** RLS on Supabase app tables
- External vendors increase attack surface and data-processing agreements — avoided by default

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product / Founder | Mohamed | 2026-06-10 | **Approved** (P17-9-0A) |
| P0 / Platform | — | 2026-06-10 | Documented |
| P7 Security | — | — | N/A (baseline stack) |

---

## Implementation notes

- Notification system (P17-9) implements on this stack only
- PRs introducing vendor SDKs must cite superseding ADR or be rejected
- See [adr/README.md](./README.md) for lifecycle and mandatory ADR triggers

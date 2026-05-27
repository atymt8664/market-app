# P8 — Admin Notes (Operations Center)

**Purpose:** Track admin maturity work, deferred items, and cross-P ownership — so nothing is lost between phases.

**Authority:** Complements [P08-admin.md](./P08-admin.md). Live priorities: [PROJECT_STATE.md](../PROJECT_STATE.md).

---

## Completed in-repo (P8B / P8C)

| Item | State |
|------|--------|
| NOC dashboard (`noc` block on `/api/admin/dashboard`) | ✅ Local/STAGING |
| Section order: needs action → users → system health → activity → queues | ✅ |
| Structured activity feed (actor, actionKey, reason, deep link) | ✅ |
| Notification center **architecture UI** (no backend feed) | ✅ Contract only |
| Roles & permissions **architecture UI** | ✅ Contract only |
| Shell + NOC i18n under `p8.admin.*` | ✅ ar/en/de |
| CPU host metrics | ⏳ Placeholder key → P13 |

---

## Deferred — must not be forgotten

### P8D — User center gaps

| Gap | Owner | Notes |
|-----|-------|-------|
| `last_seen_at` not shown in admin users UI | P8 | DB field exists; wire read-only in users list/detail |
| `?avatarReview=pending` query not filtered in users page | P8 | Queue deep link from NOC; add API filter + UI |
| Staff display names | P8F | Today: `actorAdminId` → Founder/Moderator role keys only |

### P8E — Support & moderation attribution

| Gap | Owner | Notes |
|-----|-------|-------|
| Support reply `adminId` uses `session.userId` (often null) | P8 | Use `adminActorId` |
| Duplicate report routes (`/admin/reports` vs `/reports/admin`) | P8 + P7 | Unify on `/admin/reports*`; audit on all status changes |
| Ad reject **reason** not stored in `admin_activity_logs.details` | P8 | Activity shows status transition only until reject reason field added |

### P8F — RBAC (Roles & Permissions)

| Deliverable | Notes |
|-------------|-------|
| Tables: `admin_staff`, `admin_roles`, `admin_permissions`, `admin_role_permissions` | Design in P8C UI; **no DB in P8C** per charter |
| Middleware: permission check per route | Founder bypass always |
| Session: `adminRoleKey`, staff display name | Replace hardcoded `primary-admin` / `actorAdminId: 1` |
| UI: hide nav/actions by permission | Scales 1 → 50 staff without layout rewrite |

**Role matrix (target):**

| Role | Scope |
|------|--------|
| Founder / Super Admin | Full — delete, ban, staff, settings, monitoring |
| Moderator | Ads, reports, avatar review |
| Support Agent | Support tickets only |
| Verification Staff | Verification queue only |
| Analyst | Read-only stats/analytics |

### P8G — Full admin i18n migration

| Area | Current keys | Target |
|------|--------------|--------|
| NOC + shell | `p8.admin.*` | ✅ Done (P8C) |
| Billing, verification, plans pages | `admin_billing.*`, hardcoded Arabic | Migrate → `p8.admin.billing.*`, etc. |
| Ads, reports, support, users, settings, logs | Hardcoded Arabic | `p8.admin.*` per page |
| CI | `i18n:check` | Must pass on every admin PR |

### P8H — Verification center

| Item | State |
|------|--------|
| `/admin/verification` UI | Scaffold only |
| Backend queue | ❌ None — NOC shows count **0**, `dataAvailable: false` |
| Needs-action row | Visible with P8H label |

### Notification center backend (P11 + P15)

| Channel | Source (future) |
|---------|-----------------|
| Ad approved/rejected/review | `notifications` table + push queue |
| Reports | P7 notifications on status change |
| Support | Existing user notifications; admin inbox separate table |
| System | P13 alerts |
| Staff | P15 fan-out / Redis pub-sub at scale |

**P8C deliverable:** UI contract in `notification-center-foundation.tsx` — **no fake counts**.

---

## Cross-P links (scale & ops)

| Topic | Phase | Why |
|-------|-------|-----|
| Host CPU / VPS metrics | **P13** | NOC CPU row — `p8.admin.noc.cpu.waiting_host_metrics` |
| Observability dashboard in admin | **P13** | Wire `/api/observability/metrics` panels beyond NOC summary |
| Admin notification fan-out | **P15** | Queues for staff alerts at 1M+ notifications/day |
| Online presence aggregate | **P16** | Replace in-memory `userSockets` for multi-replica |
| Monetization / billing admin | **P10** | `/admin/billing` placeholder — no revenue API |
| Trust & safety moderation rules | **P7** | Report/ad action policies, audit completeness |

---

## Placeholder pages (explicit — not silent debt)

| Page | UI | Backend | Next phase |
|------|-----|---------|------------|
| `/admin/billing` | Placeholder €0 | None | **P10** |
| `/admin/verification` | Scaffold | None | **P8H** |
| `/admin/plans` | Static i18n prices | None | **P10** |
| Notification center | Architecture cards | None | **P11/P15** |
| Roles panel | Architecture cards | None | **P8F** |

---

## Audit & route hygiene

| Issue | Risk | Fix phase |
|-------|------|-----------|
| `/reports/admin/:id/status` without `logAdminActivity` | Medium | **P8E** |
| Single admin identity (`adminActorId: 1`) | Low now; blocks 5+ staff | **P8F** |
| `admin_activity_logs` runtime CREATE | Ops | Move to migration when approved (**P1/P8**) |

---

## Success criteria (P8 maturity complete)

- [x] Operations Center layout (company-first order)
- [x] Real-data NOC metrics (no fake counters)
- [x] Professional activity structure (who/what/when/why)
- [x] Notification + RBAC architecture documented in UI + this file
- [ ] Full `p8.admin.*` on all admin pages (**P8G**)
- [ ] RBAC enforcement (**P8F**)
- [ ] Verification + billing backends (**P8H**, **P10**)
- [ ] Host CPU in NOC (**P13**)

---

*Last updated: P8C — Admin Operations Center Refinement (local/STAGING only).*

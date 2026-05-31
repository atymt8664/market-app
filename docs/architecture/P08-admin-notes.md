# P8 — Admin Notes (Operations Center)

**Purpose:** Track admin maturity work, deferred items, and cross-P ownership — so nothing is lost between phases.

**Authority:** Complements [P08-admin.md](./P08-admin.md). **Code-verified inventory:** [P08-admin-baseline.md](./P08-admin-baseline.md). Live priorities: [PROJECT_STATE.md](../PROJECT_STATE.md).

**STAGING smoke:** [P8-1A staging admin smoke](../runbooks/P8-1A-staging-admin-smoke.md)

---

## P8-1 execution tracker

| Sub-milestone | Scope | Status |
|---------------|-------|--------|
| **P8-1A** | Baseline inventory + doc sync + smoke runbook | ✅ **Closed** |
| **P8-1B** | Settings PATCH UI | ✅ **Closed** |
| P8-1C | User center polish | ⏳ Open |
| P8-1D | Audit & logs maturity | ⏳ Open |
| P8-1E | i18n closure (P8G) | ⏳ Open |
| P8-1F | Dashboard contracts (notification / roles UX) | ⏳ Open |
| P8-1G | Billing/plans boundary (**P10**) | ⏳ Open |
| P8-1H | P13 CPU hook in NOC | ⏳ Open |
| P8-1I | STAGING verification + P8-1 close | ⏳ Open |

**Do not start P8-1B+ until P8-1A is closed** (done). **Do not start P15-1 or P17-4+ until P8-1 is closed.**

---

## Completed in-repo (verified P8-1A)

### Operations Center (P8B / P8C)

| Item | State |
|------|--------|
| NOC dashboard (`noc` on `GET /api/admin/dashboard`) | ✅ |
| Section order: needs action → users → system health → activity → queues | ✅ |
| Structured activity feed (actionKey, reason, deepLink in audit details) | ✅ |
| Notification center **architecture UI** (no backend feed) | ✅ Contract only |
| Roles & permissions **architecture UI** on NOC | ✅ Contract only (enforcement elsewhere — see RBAC below) |
| Shell + NOC i18n under `p8.admin.*` | ✅ ar/en/de keys exist (`de` has placeholder gaps — **P8-1E**) |
| CPU host metrics row | ⏳ Placeholder → **P13** |

### Workflows (post–P8C — now in baseline)

| Item | State |
|------|--------|
| Ads admin workflow (status, featured, delete, claim/assign/release, SLA) | ✅ |
| Reports admin workflow (status, ad-action, claim/assign/release, SLA) | ✅ |
| Support admin (tickets, messages, reply, claim/assign/release) | ✅ |
| Verification center UI + backend queue | ✅ |
| Staff CRUD + staff email login + force password change | ✅ |
| Operations center (`/admin/operations`) | ✅ |
| Monitoring snapshot (`/admin/monitoring`, Founder-only) | ✅ |
| Analytics page (`/admin/analytics`) | ✅ |
| Categories / cities admin | ✅ (cities: no DELETE API — hide only) |
| Activity logs (`GET /admin/logs`) | ✅ |
| Founder 2FA settings UI + API | ✅ |

### RBAC & staff (implemented — was previously documented as “future P8F”)

| Item | State |
|------|--------|
| `admin_staff` table + runtime schema ensure | ✅ |
| Role keys: founder, moderator, support, verification, analyst, finance_manager, admin_manager | ✅ |
| `requireAdminPermission` on admin routes | ✅ |
| `/admin/me` returns roleKey, permissions, displayName | ✅ |
| Frontend nav + route guards by permission | ✅ |
| Founder bypass | ✅ |
| Separate normalized `admin_roles` / `admin_permissions` DB tables | ❌ Not used — permissions are code-defined in `admin-rbac.ts` |

**Dashboard `RolesPermissionsFoundation`:** informational contract on NOC; **live RBAC** is middleware + `/admin/staff` + nav guards.

---

## Resolved items (removed from deferred — do not re-open without new regression)

| Former gap | Resolution (code) |
|------------|-------------------|
| `?avatarReview=pending` not filtered on users page | ✅ API filter + UI in `admin-users.tsx` |
| Support reply `adminId` used `session.userId` | ✅ Uses `getAdminActorId(req)` in `support.ts` |
| Duplicate `/reports/admin/*` routes | ✅ Removed; unified on `/admin/reports*` |
| Ad reject reason not in audit | ✅ `writeAdminAudit` stores `reason` in details |
| Verification “scaffold only / no backend” | ✅ `admin-verification-workflow.ts` + full UI |
| “RBAC not enforced” | ✅ Backend + frontend guards; staff accounts live |

---

## Deferred — must not be forgotten

### P8-1C — User center gaps

| Gap | Owner | Notes |
|-----|-------|-------|
| `last_seen_at` not shown in users **list** | P8-1C | Available in API + user detail modal only |
| Staff **display names** in activity logs | P8-1D | Logs show `admin#<actorAdminId>` except Founder label |

---

## Resolved — P8-1B

| Item | Resolution |
|------|------------|
| `PATCH /admin/settings` had no admin UI | ✅ Editable form on `/admin/settings` — all backend fields, CSRF, audit toast |

---

## Deferred — must not be forgotten

| Gap | Owner | Notes |
|-----|-------|-------|
| Log filters missing verification / staff / settings groups in UI | P8-1D | Backend action groups include them |
| `admin_activity_logs` runtime CREATE | P1/P8 | Move to formal migration when approved |

### P8-1E — Full admin i18n (P8G)

| Area | Current keys | Target |
|------|--------------|--------|
| NOC + shell | `p8.admin.*` | ✅ |
| Most workflow pages (ads, reports, support, users, settings, …) | `p8.admin.*` | ✅ |
| `de` locale fragment | Placeholder strings for many keys | Complete translations |
| Billing, plans | `admin_billing.*`, `admin_plans.*` | Migrate → `p8.admin.billing.*`, `p8.admin.plans.*` |
| CI | `i18n:check` | Must pass on every admin PR |

### P8-1F — Dashboard contracts

| Item | State |
|------|--------|
| Notification center backend feed | ❌ **P11 / P15** |
| Roles panel → live staff summary (optional UX) | ⏳ P8-1F |

### Outside P8 — explicit placeholders

| Page / feature | UI | Backend | Owner |
|----------------|-----|---------|-------|
| `/admin/billing` | Disconnected placeholder | None | **P10** |
| `/admin/plans` | Static i18n prices | None | **P10** |
| Notification center feed | Architecture cards on NOC | None | **P11 / P15** |
| NOC CPU metrics | Placeholder key | None | **P13** |
| `GET /admin/active-app-users-count` | NOC live users | In-memory WS map | **P16** at scale |

---

## Cross-P links (scale & ops)

| Topic | Phase | Why |
|-------|-------|-----|
| Host CPU / VPS metrics | **P13** | NOC CPU row |
| Observability panels in admin | **P13** | Beyond NOC summary |
| Admin notification fan-out | **P15** | Staff alerts at scale |
| Online presence aggregate | **P16** | Multi-replica WebSocket |
| Monetization / billing admin | **P10** | Revenue APIs |
| Trust & safety policies | **P7** | Moderation policy source |

---

## Placeholder pages (explicit — not silent debt)

See [P08-admin-baseline.md](./P08-admin-baseline.md) § Feature readiness. Billing and plans **must** show disconnected state until **P10**.

---

## Audit & route hygiene

| Issue | Risk | Status / phase |
|-------|------|----------------|
| Legacy `/reports/admin/*` without audit | Medium | ✅ Removed |
| Founder session `adminActorId: 1` | Low | By design for founder password login |
| Staff multi-user | — | ✅ Staff rows + `admin_actor_id` |
| City DELETE in logs action group but no DELETE route | Low | Hide-only policy; document or add route in future P8 if needed |

---

## Success criteria (P8-1 maturity complete)

- [x] Operations Center layout (company-first order)
- [x] Real-data NOC metrics (no fake counters on workflow badges)
- [x] Professional activity structure (who/what/when/why + reason on reject)
- [x] Notification + RBAC architecture documented in UI + baseline
- [x] RBAC enforcement (backend middleware + frontend guards + staff accounts)
- [x] Verification backend + UI
- [x] Settings editor UI (**P8-1B**)
- [ ] Full `p8.admin.*` on all admin pages including `de` quality (**P8-1E**)
- [ ] Billing backend (**P10** — explicit defer, not P8-1 blocker for core ops)
- [ ] Host CPU in NOC (**P13** — **P8-1H**)
- [ ] STAGING smoke sign-off (**P8-1I**)

---

*Last updated: P8-1A — Baseline & doc sync (docs only).*

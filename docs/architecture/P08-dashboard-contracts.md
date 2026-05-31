# P8-1F — Admin Dashboard Contracts

**Authority:** KPI contract registry for all admin dashboards. **Code source:** `artifacts/souq/src/features/admin/dashboard-contracts.ts`

**Related:** [P08-admin-baseline.md](./P08-admin-baseline.md) · [P08-admin-notes.md](./P08-admin-notes.md)

**Validation:** `pnpm --filter @workspace/souq run p8-1f:validate`

---

## Dashboard surfaces

| Surface | Route | Primary API | RBAC |
|---------|-------|-------------|------|
| **Main / NOC** | `/admin` | `GET /api/admin/dashboard` + `GET /api/admin/active-app-users-count` | `dashboard.operations` or `dashboard.moderation` |
| **Analytics** | `/admin/analytics` | `GET /api/admin/analytics?period=` | `analytics` |
| **Operations** | `/admin/operations` | `GET /api/admin/operations/founder` | Founder only (UI guard) |
| **Monitoring** | `/admin/monitoring` | `GET /api/admin/monitoring` | Founder + `system` permission |

UI elements expose `data-dashboard-contract="<id>"` for traceability to this registry.

---

## Contract schema

Each contract defines:

| Field | Description |
|-------|-------------|
| `id` | Stable identifier (e.g. `noc.user.online_now`) |
| `dashboard` | Surface: `main` \| `analytics` \| `operations` \| `monitoring` |
| `name` | Human-readable KPI name |
| `api` | HTTP endpoint |
| `responsePath` | JSON path in API response |
| `source` | Database table / in-process metric |
| `meaning` | Business meaning of the value |
| `calculation` | SQL or derivation rule |
| `loadingState` | UI behaviour while fetching |
| `errorState` | UI behaviour on failure |
| `emptyState` | i18n key or behaviour when count is 0 |
| `placeholder` | `true` when backend not yet wired |

---

## Main / NOC (`GET /api/admin/dashboard`)

Built in `artifacts/api-server/src/lib/admin-noc-snapshot.ts` from PostgreSQL + observability snapshots.

### Executive header — today strip

| Contract ID | Meaning | Calculation |
|-------------|---------|-------------|
| `noc.executive.today.new_users` | Registrations since midnight | `COUNT(users) WHERE created_at >= today` |
| `noc.executive.today.new_ads` | Approved ads today | `COUNT(ads) status=approved AND created_at >= today` |
| `noc.executive.today.new_reports` | Reports open/pending (route badge semantics) | `COUNT(reports) status IN (open, pending)` |
| `noc.executive.today.new_support` | Support tickets created today | `COUNT(support_tickets) created_at >= today` |
| `noc.executive.intervention_count` | Actionable needs-attention count | needsAction items with count>0 and severity ≠ info |

**Loading:** `DashboardSkeleton` on `/admin` until first response. **Error:** `AdminErrorState` + retry.

### User intelligence row

| Contract ID | Source | Notes |
|-------------|--------|-------|
| `noc.user.online_now` | `GET /api/admin/active-app-users-count` → WS map | Poll 45s; falls back to NOC snapshot. **P16** at multi-replica scale |
| `noc.user.active_5m` | `users.last_seen_at >= now()-5m` | DB |
| `noc.user.active_today` | `users.last_seen_at >= today` | DB |
| `noc.user.new_users_today` | Same as executive new users | Duplicate surface |
| `noc.user.blocked_users` | `users.is_banned=true` | Links to `/admin/users?status=banned` |
| `noc.user.pending_verification_email` | `users.email_verified=false` | **Not** verification workflow queue |

### Priority vs verification (important distinction)

| Contract ID | Count source | Deep link |
|-------------|--------------|-----------|
| `noc.user.pending_verification_email` | Unverified emails | `/admin/users?status=unverified` |
| `noc.priority.verification_queue` | `countOpenVerificationRequests()` | `/admin/verification` |

### Needs action now

| Contract ID | Calculation |
|-------------|-------------|
| `noc.needs_action.pending_ads` | `ads.status=pending` |
| `noc.needs_action.open_reports` | status IN `open, under_review, pending, in_review` |
| `noc.needs_action.open_support` | status IN `open, pending` |
| `noc.needs_action.avatar_review` | `users.avatar_pending_review=true` |
| `noc.needs_action.critical_issues` | readyz fail + WS unhealthy + reports ≥8/h |

### System health grid (Founder + `system` only)

| Key | Source | Placeholder |
|-----|--------|-------------|
| `api` | DB readiness /readyz | — |
| `websocket` | In-process WS metrics | — |
| `ram` | Process RSS/heap | — |
| `cpu` | — | **P13 / P8-1H** — `noc.health.cpu` |
| `database`, `redis`, `storage`, `push_worker`, `queue_worker`, `p95_latency` | Infrastructure health snapshot | redis/storage unconfigured → status `unconfigured` |

### Queue center

| Contract ID | Same count as |
|-------------|---------------|
| `noc.queue.pending_ads` | pending ads |
| (reports/support/avatar) | open reports, open support, avatar review |

**P8-1F fix:** Non-founder roles retain `queueCenter` as an **array** (previously corrupted by object spread → runtime `.map` failure).

### Activity feed

| Contract ID | Source |
|-------------|--------|
| `noc.activity.recent` | Merged `admin_activity_logs` + recent ads/reports/users/support (max 30, UI 8) |

**Empty:** `p8.admin.noc.activity.empty`

### Architecture placeholders (no live KPI)

| Contract ID | Owner |
|-------------|-------|
| `monitoring.notification_feed` | **P11 / P15** |
| `monitoring.roles_staff_summary` | Static RBAC contract; optional live staff via `/admin/staff` |

---

## Analytics (`GET /api/admin/analytics`)

Period query: `today` \| `7d` \| `30d` \| `all`. Handler: `handleAdminAnalytics` in `routes/admin.ts`.

| Contract ID | Meaning |
|-------------|---------|
| `analytics.totals.*` | All-time totals (users, ads, reports, support, views, cities, categories) |
| `analytics.foundation.report_resolution_rate` | `resolved / (resolved+open+in_review) × 100`; **null** when denominator 0 — UI shows em dash |
| `analytics.foundation.support_resolution_rate` | `(resolved+closed)/total × 100`; null when total 0 |
| `analytics.period_metrics` | Period-filtered counts for bar chart |

**Loading:** `AdminPageLoading`. **Error:** `AdminErrorState` + refresh.

---

## Operations (`GET /api/admin/operations/founder`)

| Contract ID | Meaning |
|-------------|---------|
| `operations.health.total_open` | Sum open items all domains |
| `operations.health.total_unassigned` | Items without assignee |
| `operations.health.sla_exceeded` | Past SLA deadline |
| `operations.staff_load` | Per-staff open/SLA/load% table |

**Empty staff:** `p8.admin.operations.no_staff`

---

## Monitoring (`GET /api/admin/monitoring`)

Founder-only snapshot from `buildAdminMonitoringSnapshot()`.

| Section | Key contracts |
|---------|---------------|
| Overall | `monitoring.overall_status` |
| Server | `monitoring.server.cpu` (load avg — NOC CPU deferred here) |
| API | `monitoring.api.latency_p95` |
| WebSocket | `monitoring.ws.online_users` |
| Founder | `monitoring.founder.sla_exceeded` |

Poll interval: 20s on `/admin/monitoring`.

---

## Nav badges (shell)

Fetched once per mount via `getAdminNavBadges()` — no polling.

| Badge | Source field |
|-------|--------------|
| Pending ads | `badges.adsPendingReview` |
| Open reports | `badges.reportsOpen` |
| Open support | `badges.supportOpen` |
| New users today | `badges.usersNewToday` |
| Verification open | `verificationStats.unassigned` or `badges.verificationOpen` |

Contract: `nav.badge.ads_pending` (see registry for siblings).

---

## Known semantic notes (documented, not bugs)

1. **Open reports** on NOC uses broader status set than analytics “new reports” count.
2. **Online users** is single-instance WebSocket map until **P16**.
3. **NOC CPU** placeholder; host CPU available on Monitoring page.
4. **Unverified email** ≠ **verification workflow queue** — separate contract IDs.

---

## P8-1F closure checklist

- [x] Registry: `dashboard-contracts.ts`
- [x] UI wiring: `data-dashboard-contract` on all five dashboard surfaces
- [x] Regression fix: `queueCenter` array for non-founder
- [x] Analytics resolution rate null → em dash (not 0%)
- [x] i18n: needs_action verification label clarified
- [x] Validate script: `p8-1f:validate`

---

*Last updated: P8-1F — Dashboard contracts closed.*

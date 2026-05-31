# P8-1H — Monitoring boundary & CPU hook (NOC ↔ API host metrics)

**Status:** ✅ Closed (2026-05-31) — `p8-1h:validate` + `p8-1h:prod` PASS · Vercel deployed · VPS image `souq-api:p8-1h-20260531` (operator deploy for API JSON).

**Authority:** `artifacts/souq/src/lib/monitoring-boundary.ts` · `artifacts/souq/src/features/admin/dashboard-contracts.ts`

**Related:** [P08-dashboard-contracts.md](./P08-dashboard-contracts.md) · [P08-admin-notes.md](./P08-admin-notes.md) · [P13-analytics-observability.md](./P13-analytics-observability.md)

---

## Root cause (pre–P8-1H)

| Issue | Detail |
|-------|--------|
| NOC CPU row | Always `status=muted`, `value=null`, i18n `waiting_host_metrics` — **misleading** because live host metrics already existed on `/admin/monitoring` via `snapshotServerMetrics()` |
| No tier labels | Admins could not distinguish live API metrics vs architecture placeholders vs future VPS exporters |
| Duplicate truth | Monitoring page showed real load averages; NOC implied “not connected” |

**Not in scope:** Prometheus, Grafana, node_exporter, new VPS services, or wiring `phase6-vps-monitor-snapshot.sh` into admin APIs.

---

## Monitoring tiers

| Tier | Meaning | Examples |
|------|---------|----------|
| **live** | Real data at request time from DB, in-process observability, or Node `os` on API host | NOC CPU load, Monitoring server/API/DB/WS sections |
| **placeholder** | UI contract only; no KPI backend | Notification center foundation, roles summary on NOC |
| **future** | Documented ops/infra paths not exposed to admin | node_exporter, phase6 cron snapshots |

UI marker: `data-monitoring-tier="live|placeholder|future"`.

---

## Live sources (connected)

| Contract ID | API | Source module |
|-------------|-----|---------------|
| `noc.health.cpu` | `GET /api/admin/dashboard` | `snapshotServerMetrics` → `buildNocCpuFromServerMetrics` |
| `monitoring.server.cpu` | `GET /api/admin/monitoring` | `snapshotServerMetrics` |
| `monitoring.server.ram` | same | `os.totalmem` / `process.memoryUsage` |
| `monitoring.server.disk` | same | `fs.statfs(cwd)` — em dash when unavailable |
| `monitoring.system_health` | same | readiness + infrastructure + observability |
| `monitoring.api.latency_p95` | same | in-process HTTP latency ring |
| `monitoring.ws.online_users` | same | WebSocket connection map |

**CPU semantics (NOC + Monitoring):** Linux **load average** (1m), not a fabricated CPU %. Warn on NOC when `loadAvg1m >= cores`.

---

## Placeholder (not connected)

| Contract ID | Surface | Owner |
|-------------|---------|-------|
| `monitoring.notification_feed` | NOC architecture card | P11 / P15 |
| `monitoring.roles_staff_summary` | NOC RBAC contract | Enforcement elsewhere |

---

## Future (not connected)

| ID | Notes |
|----|-------|
| `monitoring.vps_node_exporter` | No exporter endpoint in API |
| `monitoring.vps_cron_snapshot` | `infra/hetzner/phase6/phase6-vps-monitor-snapshot.sh` writes local logs only |

---

## Validation

| Script | Purpose |
|--------|---------|
| `pnpm --filter @workspace/souq run p8-1h:validate` | Registry, NOC CPU wiring, i18n, no fake CPU in dashboard-home |
| `pnpm --filter @workspace/souq run p8-1h:prod` | Production API guards + bundle markers (`noc.health.cpu`, `data-monitoring-tier`) |

---

## Rollback

1. Revert commit(s) for P8-1H.
2. Redeploy API (VPS) and frontend (Vercel).
3. NOC CPU returns to muted placeholder (previous behaviour).

---

*P8-1H — Monitoring boundary & CPU hook.*

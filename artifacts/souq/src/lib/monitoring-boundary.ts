/**
 * P8-1H — Monitoring boundary tiers (live vs placeholder vs future).
 * Docs: docs/architecture/P08-monitoring-boundary.md
 */

export type MonitoringTier = "live" | "placeholder" | "future";

export type MonitoringBoundaryEntry = {
  id: string;
  tier: MonitoringTier;
  surface: "noc" | "monitoring" | "noc_architecture";
  api?: string;
  source: string;
  owner?: string;
};

export const MONITORING_BOUNDARY: MonitoringBoundaryEntry[] = [
  {
    id: "noc.health.cpu",
    tier: "live",
    surface: "noc",
    api: "GET /api/admin/dashboard",
    source: "node:os.loadavg + os.cpus (API process host)",
  },
  {
    id: "monitoring.server.cpu",
    tier: "live",
    surface: "monitoring",
    api: "GET /api/admin/monitoring",
    source: "snapshotServerMetrics → node:os",
  },
  {
    id: "monitoring.server.ram",
    tier: "live",
    surface: "monitoring",
    api: "GET /api/admin/monitoring",
    source: "os.totalmem/freemem + process.memoryUsage",
  },
  {
    id: "monitoring.server.disk",
    tier: "live",
    surface: "monitoring",
    api: "GET /api/admin/monitoring",
    source: "fs.statfs(cwd) — shows unavailable when statfs fails",
  },
  {
    id: "monitoring.system_health",
    tier: "live",
    surface: "monitoring",
    api: "GET /api/admin/monitoring",
    source: "readiness + infrastructure health + observability",
  },
  {
    id: "monitoring.notification_feed",
    tier: "placeholder",
    surface: "noc_architecture",
    source: "UI contract only",
    owner: "P11 / P15",
  },
  {
    id: "monitoring.roles_staff_summary",
    tier: "placeholder",
    surface: "noc_architecture",
    source: "RBAC contract UI",
    owner: "P8 RBAC enforcement elsewhere",
  },
  {
    id: "monitoring.vps_node_exporter",
    tier: "future",
    surface: "monitoring",
    source: "Not deployed — no Prometheus/node_exporter hook",
    owner: "P13+",
  },
  {
    id: "monitoring.vps_cron_snapshot",
    tier: "future",
    surface: "monitoring",
    source: "infra/hetzner/phase6/phase6-vps-monitor-snapshot.sh (ops logs only)",
    owner: "P13+",
  },
];

export function monitoringTierAttrs(
  tier: MonitoringTier,
): { "data-monitoring-tier": MonitoringTier } {
  return { "data-monitoring-tier": tier };
}

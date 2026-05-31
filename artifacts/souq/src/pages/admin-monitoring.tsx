import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  Crown,
  Database,
  Gauge,
  HeartPulse,
  Radio,
  Server,
  Workflow,
} from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import { dashboardContractAttrs } from "@/features/admin/dashboard-contracts";
import { CARD_SHELL, SUB_CARD } from "@/features/admin/admin-interaction-classes";
import {
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { MonitoringBoundaryLegend } from "@/features/admin/components/monitoring-boundary-legend";
import { useAdminAccess, useAdminMonitoring, useRequireAdmin } from "@/features/admin/hooks";
import { monitoringTierAttrs } from "@/lib/monitoring-boundary";
import type { ComponentHealth, MonitoringAlert, MonitoringSeverity } from "@/features/admin/monitoring-types";
import { formatAdminDateTime, formatAdminNumber } from "@/features/admin/admin-locale";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

function healthLabel(name: string) {
  const key = `p8.admin.monitoring.health.${name}` as const;
  const translated = t(key);
  return translated === key ? name : translated;
}

function domainLabel(domain: string) {
  const key = `p8.admin.monitoring.domain.${domain}` as const;
  const translated = t(key);
  return translated === key ? domain : translated;
}

function severityTone(severity: MonitoringSeverity): string {
  if (severity === "critical") return "border-red-500/45 bg-red-950/25 text-red-200";
  if (severity === "warning") return "border-amber-500/45 bg-amber-950/25 text-amber-200";
  return "border-emerald-500/45 bg-emerald-950/20 text-emerald-200";
}

function severityDot(severity: MonitoringSeverity): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-400";
  return "bg-emerald-500";
}

function severityLabel(severity: MonitoringSeverity): string {
  if (severity === "critical") return t("p8.admin.monitoring.severity_critical");
  if (severity === "warning") return t("p8.admin.monitoring.severity_warning");
  return t("p8.admin.monitoring.severity_ok");
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return t("p8.admin.common.dash");
  return formatAdminNumber(value, getLocale());
}

function MetricCard({
  contractId,
  label,
  value,
  sub,
  tone,
}: {
  contractId?: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "amber" | "default";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/35 bg-red-950/20"
      : tone === "amber"
        ? "border-amber-500/35 bg-amber-950/20"
        : "border-primary/30 bg-zinc-950/60";
  const contractProps = contractId ? dashboardContractAttrs(contractId) : {};
  return (
    <div className={cn(SUB_CARD, toneClass, "p-4 text-right")} {...contractProps}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function HealthTile({ name, health }: { name: string; health: ComponentHealth }) {
  return (
    <div className={cn(SUB_CARD, "p-4 text-right", severityTone(health.status))}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", severityDot(health.status))} />
        <h3 className="font-semibold">{healthLabel(name)}</h3>
      </div>
      <p className="mt-2 text-xs opacity-90">{severityLabel(health.status)}</p>
      <p className="mt-1 text-sm">{health.detail}</p>
      {health.latencyMs != null ? (
        <p className="mt-1 text-xs tabular-nums opacity-80">{health.latencyMs}ms</p>
      ) : null}
    </div>
  );
}

function AlertCard({ alert }: { alert: MonitoringAlert }) {
  return (
    <div
      className={cn(
        SUB_CARD,
        "p-4 text-right",
        alert.severity === "critical"
          ? "border-red-500/45 bg-red-950/30"
          : "border-amber-500/45 bg-amber-950/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <AlertTriangle
          className={cn(
            "h-5 w-5 shrink-0",
            alert.severity === "critical" ? "text-red-400" : "text-amber-400",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{alert.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
          <p className="mt-2 text-sm">{alert.nextStep}</p>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            {t("p8.admin.monitoring.audit_id")} {alert.auditActivityId ?? alert.id}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminMonitoringPage() {
  const { dir } = useAdminLocale();
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const monitoringQuery = useAdminMonitoring(access.isFounder && !meQuery.isLoading);

  if (meQuery.isLoading || !access.isFounder) {
    if (!meQuery.isLoading && !access.isFounder) {
      navigate(access.homePath);
    }
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.monitoring.loading")} />
      </div>
    );
  }

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const data = monitoringQuery.data?.snapshot;
  const errorMessage =
    monitoringQuery.error instanceof Error
      ? monitoringQuery.error.message
      : t("p8.admin.common.error_generic");

  return (
    <AdminShell activeKey="monitoring" onLogout={onLogout}>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/45 bg-amber-500/10 text-amber-300">
            <Crown className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <h1 className="text-xl font-bold sm:text-2xl">{t("p8.admin.monitoring.title")}</h1>
            <p className="text-sm text-zinc-400">{t("p8.admin.monitoring.subtitle")}</p>
            {data ? (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {t("p8.admin.monitoring.snapshot_label")} {data.snapshotId.slice(0, 8)}… ·{" "}
                {formatAdminDateTime(data.generatedAt, getLocale())}
              </p>
            ) : null}
          </div>
          {data ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-2 text-sm font-semibold",
                severityTone(data.overallStatus),
              )}
            >
              {severityLabel(data.overallStatus)}
            </div>
          ) : null}
        </header>

        {monitoringQuery.isLoading ? (
          <AdminPageLoading message={t("p8.admin.monitoring.loading")} />
        ) : monitoringQuery.isError ? (
          <AdminErrorState
            title={t("p8.admin.monitoring.load_error_title")}
            description={`${errorMessage} — ${t("p8.admin.monitoring.load_error_hint")}`}
            onRetry={() => void monitoringQuery.refetch()}
            retryLabel={t("p8.admin.page.retry")}
          />
        ) : data ? (
          <>
            {data.alerts.length > 0 ? (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden />
                  {t("p8.admin.monitoring.alerts_title")} ({data.alerts.length})
                </h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.alerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              </section>
            ) : (
              <div className={cn(CARD_SHELL, "border-emerald-500/35 bg-emerald-950/15 p-4 text-right text-emerald-200")}>
                {t("p8.admin.monitoring.no_alerts")}
              </div>
            )}

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <HeartPulse className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.system_health")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(data.systemHealth).map(([key, health]) => (
                  <HealthTile key={key} name={key} health={health} />
                ))}
              </div>
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Crown className="h-5 w-5 text-amber-300" aria-hidden />
                {t("p8.admin.monitoring.founder_view")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label={t("p8.admin.monitoring.founder_down_services")}
                  value={formatNumber(data.founder.downServices.length)}
                  tone={data.founder.downServices.length > 0 ? "red" : "default"}
                />
                <MetricCard
                  contractId="monitoring.founder.sla_exceeded"
                  label={t("p8.admin.monitoring.founder_sla_exceeded")}
                  value={formatNumber(data.founder.slaAlerts.totalSlaExceeded)}
                  tone={data.founder.slaAlerts.totalSlaExceeded > 0 ? "red" : "default"}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.founder_overloaded")}
                  value={formatNumber(data.founder.systemPressure.overloadedStaff)}
                  tone={data.founder.systemPressure.overloadedStaff > 0 ? "amber" : "default"}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.founder_error_rate")}
                  value={
                    data.founder.systemPressure.errorRatePercent != null
                      ? `${data.founder.systemPressure.errorRatePercent}%`
                      : t("p8.admin.common.dash")
                  }
                  tone={data.founder.highErrors ? "red" : "default"}
                />
              </div>
              {data.founder.bottlenecks.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {data.founder.bottlenecks.map((b) => (
                    <div key={b.domain} className={SUB_CARD}>
                      <h3 className="font-semibold">{domainLabel(b.domain)}</h3>
                      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.monitoring.unassigned")}</dt>
                          <dd className="font-semibold tabular-nums">{b.unassigned}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.monitoring.sla_exceeded")}</dt>
                          <dd className="font-semibold tabular-nums text-red-300">{b.slaExceeded}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={CARD_SHELL} {...monitoringTierAttrs("live")}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Server className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.server_metrics")}
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">{t("p8.admin.monitoring.server_metrics_source")}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  contractId="monitoring.server.cpu"
                  label={t("p8.admin.monitoring.metric_cpu_cores")}
                  value={formatNumber(data.serverMetrics.cpu.cores)}
                  sub={`Load 1m: ${data.serverMetrics.cpu.loadAvg1m?.toFixed(2) ?? t("p8.admin.common.dash")}`}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_system_ram")}
                  value={
                    data.serverMetrics.memory.systemUsedPercent != null
                      ? `${data.serverMetrics.memory.systemUsedPercent}%`
                      : t("p8.admin.common.dash")
                  }
                  sub={`${formatNumber(data.serverMetrics.memory.systemFreeMb)} MB free / ${formatNumber(data.serverMetrics.memory.systemTotalMb)} MB`}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_process_memory")}
                  value={`${data.serverMetrics.memory.processRssMb} MB`}
                  sub={`Heap ${data.serverMetrics.memory.processHeapUsedMb}/${data.serverMetrics.memory.processHeapTotalMb} MB`}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_disk")}
                  value={
                    data.serverMetrics.disk.available && data.serverMetrics.disk.usedPercent != null
                      ? `${data.serverMetrics.disk.usedPercent}%`
                      : t("p8.admin.monitoring.unavailable")
                  }
                  sub={
                    data.serverMetrics.disk.available
                      ? `${data.serverMetrics.disk.freeGb} GB free / ${data.serverMetrics.disk.totalGb} GB`
                      : undefined
                  }
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_network")}
                  value={formatNumber(data.serverMetrics.network.activeInterfaceCount)}
                  sub={`${data.serverMetrics.network.interfaceCount} total`}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_uptime")}
                  value={`${Math.floor(data.serverMetrics.process.uptimeSeconds / 60)}m`}
                  sub={`PID ${data.serverMetrics.process.pid} · ${data.serverMetrics.process.nodeVersion}`}
                />
              </div>
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Gauge className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.api_metrics")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label={t("p8.admin.monitoring.metric_requests")} value={formatNumber(data.apiMetrics.requestCount)} />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_latency_p50")}
                  value={data.apiMetrics.latencyMs.p50Ms != null ? `${data.apiMetrics.latencyMs.p50Ms}ms` : t("p8.admin.common.dash")}
                />
                <MetricCard
                  contractId="monitoring.api.latency_p95"
                  label={t("p8.admin.monitoring.metric_latency_p95")}
                  value={data.apiMetrics.latencyMs.p95Ms != null ? `${data.apiMetrics.latencyMs.p95Ms}ms` : t("p8.admin.common.dash")}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_latency_p99")}
                  value={data.apiMetrics.latencyMs.p99Ms != null ? `${data.apiMetrics.latencyMs.p99Ms}ms` : t("p8.admin.common.dash")}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.error_rate")}
                  value={
                    data.apiMetrics.errorRatePercent != null
                      ? `${data.apiMetrics.errorRatePercent}%`
                      : t("p8.admin.common.dash")
                  }
                  tone={data.founder.highErrors ? "red" : "default"}
                />
              </div>
              {data.apiMetrics.slowEndpoints.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-muted-foreground">
                        <th className="py-2 font-medium">{t("p8.admin.monitoring.col_path")}</th>
                        <th className="py-2 font-medium">{t("p8.admin.monitoring.col_count")}</th>
                        <th className="py-2 font-medium">{t("p8.admin.monitoring.col_p95")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.apiMetrics.slowEndpoints.map((row) => (
                        <tr key={row.route} className="border-b border-zinc-900/80">
                          <td className="py-2 font-mono text-xs">{row.route}</td>
                          <td className="py-2 tabular-nums">{row.count}</td>
                          <td className="py-2 tabular-nums text-amber-300">
                            {row.latencyMs.p95Ms != null ? `${row.latencyMs.p95Ms}ms` : t("p8.admin.common.dash")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Database className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.db_metrics")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={t("p8.admin.monitoring.metric_queries")} value={formatNumber(data.databaseMetrics.queryCount)} />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_slow_queries")}
                  value={formatNumber(data.databaseMetrics.slowQueryCount)}
                  tone={data.databaseMetrics.slowQueryCount > 0 ? "amber" : "default"}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_pool_util")}
                  value={
                    data.databaseMetrics.pool.utilizationPercent != null
                      ? `${data.databaseMetrics.pool.utilizationPercent}%`
                      : t("p8.admin.common.dash")
                  }
                  sub={`${data.databaseMetrics.pool.totalCount - data.databaseMetrics.pool.idleCount}/${data.databaseMetrics.pool.maxConnections} active · ${data.databaseMetrics.pool.waitingCount} waiting`}
                />
                <MetricCard
                  label="DB p95"
                  value={
                    data.databaseMetrics.latencyMs.p95Ms != null
                      ? `${data.databaseMetrics.latencyMs.p95Ms}ms`
                      : t("p8.admin.common.dash")
                  }
                />
              </div>
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Radio className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.ws_metrics")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  contractId="monitoring.ws.online_users"
                  label={t("p8.admin.monitoring.metric_ws_online")}
                  value={formatNumber(data.websocketMetrics.onlineUsers)}
                />
                <MetricCard label={t("p8.admin.monitoring.metric_ws_connections")} value={formatNumber(data.websocketMetrics.socketConnections)} />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_ws_disconnects")}
                  value={formatNumber(data.websocketMetrics.window.disconnectsLastMinute)}
                  tone={data.websocketMetrics.window.disconnectSpike ? "amber" : "default"}
                />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_ws_reconnects")}
                  value={formatNumber(data.websocketMetrics.window.connectsLastMinute)}
                  tone={data.websocketMetrics.window.reconnectSpike ? "amber" : "default"}
                />
              </div>
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Workflow className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.monitoring.queue_metrics")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label={t("p8.admin.monitoring.metric_pending")} value={formatNumber(data.queueMetrics.push.pending)} />
                <MetricCard label={t("p8.admin.monitoring.metric_active")} value={formatNumber(data.queueMetrics.push.active)} />
                <MetricCard label={t("p8.admin.monitoring.metric_processed")} value={formatNumber(data.queueMetrics.push.processed)} />
                <MetricCard
                  label={t("p8.admin.monitoring.metric_failed")}
                  value={formatNumber(data.queueMetrics.push.failed)}
                  tone={(data.queueMetrics.push.failed ?? 0) > 0 ? "red" : "default"}
                />
                <MetricCard label={t("p8.admin.monitoring.metric_queue_depth")} value={formatNumber(data.queueMetrics.queueWorkerDepth)} />
              </div>
            </section>

            <MonitoringBoundaryLegend />
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

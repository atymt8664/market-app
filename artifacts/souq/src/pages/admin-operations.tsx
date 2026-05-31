import { Link, useLocation } from "wouter";
import { AlertTriangle, Crown, ExternalLink, Users, Workflow } from "lucide-react";
import { adminLogout } from "@/features/admin/api";
import { CARD_SHELL, SUB_CARD } from "@/features/admin/admin-interaction-classes";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminAccess, useAdminFounderOperations, useRequireAdmin } from "@/features/admin/hooks";
import type { OpsDomain } from "@/features/admin/operations-queue-types";
import { formatAdminDateTime } from "@/features/admin/admin-locale";
import { getLocale, t } from "@/i18n";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { cn } from "@/lib/utils";

const DOMAIN_LINKS: Record<OpsDomain, string> = {
  verification: "/admin/verification",
  reports: "/admin/reports",
  support: "/admin/support",
  ads: "/admin/ads",
};

function domainLabel(domain: OpsDomain | string) {
  const key = `p8.admin.operations.domain.${domain}` as const;
  const translated = t(key);
  return translated === key ? String(domain) : translated;
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" | "default" }) {
  const toneClass =
    tone === "red"
      ? "border-red-500/35 bg-red-950/20"
      : tone === "amber"
        ? "border-amber-500/35 bg-amber-950/20"
        : "border-primary/30 bg-zinc-950/60";
  return (
    <div className={cn(SUB_CARD, toneClass, "p-4 text-right")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminOperationsPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const opsQuery = useAdminFounderOperations(access.isFounder && !meQuery.isLoading);

  if (meQuery.isLoading || !access.isFounder) {
    if (!meQuery.isLoading && !access.isFounder) {
      navigate(access.homePath);
    }
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.operations.loading")} />
      </div>
    );
  }

  const data = opsQuery.data;
  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const errorMessage =
    opsQuery.error instanceof Error ? opsQuery.error.message : t("p8.admin.common.error_generic");

  return (
    <AdminShell activeKey="operations" onLogout={onLogout}>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/45 bg-amber-500/10 text-amber-300">
            <Crown className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <h1 className="text-xl font-bold sm:text-2xl">{t("p8.admin.operations.title")}</h1>
            <p className="text-sm text-zinc-400">{t("p8.admin.operations.subtitle")}</p>
            {data ? (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {t("p8.admin.operations.last_updated")}{" "}
                {formatAdminDateTime(data.generatedAt, getLocale())}
              </p>
            ) : null}
          </div>
        </header>

        {opsQuery.isLoading ? (
          <AdminPageLoading message={t("p8.admin.operations.loading")} />
        ) : opsQuery.isError ? (
          <AdminErrorState
            title={t("p8.admin.operations.load_error_title")}
            description={`${errorMessage} — ${t("p8.admin.operations.load_error_hint")}`}
            onRetry={() => void opsQuery.refetch()}
            retryLabel={t("p8.admin.operations.retry")}
          />
        ) : data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label={t("p8.admin.operations.metric_open")} value={data.health.totalOpen} />
              <Metric
                label={t("p8.admin.operations.metric_unassigned")}
                value={data.health.totalUnassigned}
                tone="amber"
              />
              <Metric
                label={t("p8.admin.operations.metric_sla_exceeded")}
                value={data.health.totalSlaExceeded}
                tone="red"
              />
              <Metric
                label={t("p8.admin.operations.metric_escalation")}
                value={data.health.totalEscalation}
                tone="amber"
              />
              <Metric
                label={t("p8.admin.operations.metric_overloaded")}
                value={data.health.overloadedStaff}
                tone="red"
              />
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Workflow className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.operations.queues_by_domain")}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {data.summary.domains.map((domain) => {
                  const domainKey = domain.domain as OpsDomain;
                  return (
                    <div key={domainKey} className={SUB_CARD}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Link
                          href={DOMAIN_LINKS[domainKey]}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {t("p8.admin.operations.open_section")}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        <h3 className="font-semibold">{domainLabel(domainKey)}</h3>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.operations.domain_open")}</dt>
                          <dd className="font-semibold tabular-nums">{domain.total}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.operations.domain_unassigned")}</dt>
                          <dd className="font-semibold tabular-nums">{domain.unassigned}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.operations.domain_sla")}</dt>
                          <dd className="font-semibold tabular-nums text-red-300">{domain.slaExceeded}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t("p8.admin.operations.domain_escalation")}</dt>
                          <dd className="font-semibold tabular-nums">{domain.escalation}</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                {t("p8.admin.operations.staff_load")}
              </h2>
              {data.staffLoad.staff.length === 0 ? (
                <AdminEmptyState title={t("p8.admin.operations.no_staff")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-primary/20 text-xs text-muted-foreground">
                        <th className="px-3 py-2">{t("p8.admin.operations.col_staff")}</th>
                        <th className="px-3 py-2">{t("p8.admin.operations.col_role")}</th>
                        <th className="px-3 py-2">{t("p8.admin.operations.col_status")}</th>
                        <th className="px-3 py-2">{t("p8.admin.operations.col_open")}</th>
                        <th className="px-3 py-2">{t("p8.admin.operations.col_sla")}</th>
                        <th className="px-3 py-2">{t("p8.admin.operations.col_load")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.staffLoad.staff.map((member) => (
                        <tr key={member.adminActorId} className="border-b border-zinc-800/80">
                          <td className="px-3 py-2 font-medium">{member.displayName}</td>
                          <td className="px-3 py-2">{member.roleKey}</td>
                          <td className="px-3 py-2">{member.sessionStatus}</td>
                          <td className="px-3 py-2 tabular-nums">{member.openTotal}</td>
                          <td className="px-3 py-2 tabular-nums text-red-300">{member.slaExceeded}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-xs",
                                member.isOverloaded
                                  ? "border-red-500/40 text-red-200"
                                  : "border-emerald-500/40 text-emerald-200",
                              )}
                            >
                              {member.loadPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-200">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                {t("p8.admin.operations.bottlenecks")}
              </h2>
              {data.staffLoad.bottlenecks.length === 0 ? (
                <p className="text-sm text-emerald-200/90">{t("p8.admin.operations.no_bottlenecks")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.staffLoad.bottlenecks.map((item) => (
                    <li key={item.domain} className="rounded-xl border border-amber-500/30 bg-amber-950/15 px-3 py-2">
                      {t("p8.admin.operations.bottleneck_item", {
                        domain: domainLabel(item.domain),
                        unassigned: item.unassigned,
                        slaExceeded: item.slaExceeded,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={CARD_SHELL}>
              <h2 className="mb-3 text-base font-semibold text-red-200">{t("p8.admin.operations.late_staff")}</h2>
              {data.lateStaff.length === 0 ? (
                <AdminEmptyState title={t("p8.admin.operations.no_late_staff")} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.lateStaff.map((member) => (
                    <li
                      key={member.adminActorId}
                      className="rounded-xl border border-red-500/25 bg-red-950/10 px-3 py-2"
                    >
                      {t("p8.admin.operations.late_staff_item", {
                        name: member.displayName,
                        slaExceeded: member.slaExceeded,
                        loadPercent: member.loadPercent,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

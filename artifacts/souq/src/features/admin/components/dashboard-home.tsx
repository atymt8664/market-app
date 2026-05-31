import {
  Activity,
  AlertTriangle,
  Ban,
  Clock3,
  Crown,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  HeartPulse,
  Layers,
  MemoryStick,
  Radio,
  Server,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ADMIN_STAT_CARD_BTN,
  BTN_FIX,
  CARD_SHELL,
  SUB_CARD,
} from "@/features/admin/admin-interaction-classes";
import { NotificationCenterFoundation } from "@/features/admin/components/notification-center-foundation";
import { RolesPermissionsFoundation } from "@/features/admin/components/roles-permissions-foundation";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { AUTH_ACCENT_OUTLINE_BTN, AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { useAdminActiveAppUsersCount } from "../hooks";
import { useAdminAccess } from "../access";
import type {
  AdminDashboardResponse,
  AdminNocActivityItem,
  AdminNocNeedsActionItem,
  AdminNocPriorityItem,
  AdminNocPriorityLevel,
  AdminNocSnapshot,
  AdminNocSystemHealthItem,
  AdminNocSystemHealthKey,
} from "../types";

type DashboardHomeProps = {
  data: AdminDashboardResponse;
  isRefreshing?: boolean;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return t("p8.admin.noc.dash");
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString("ar-EG");
}

function NocMetricCard({
  label,
  value,
  sublabel,
  icon,
  tone = "default",
  onClick,
  className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon: ReactNode;
  tone?: "default" | "live" | "warn" | "ok" | "muted" | "fail";
  onClick?: () => void;
  className?: string;
}) {
  const toneClass =
    tone === "live"
      ? "border-emerald-500/35 ring-emerald-500/10"
      : tone === "warn"
        ? "border-amber-500/35 ring-amber-500/10"
        : tone === "ok"
          ? "border-emerald-500/30 ring-emerald-500/10"
          : tone === "fail"
            ? "border-red-500/40 ring-red-500/12"
            : tone === "muted"
              ? "border-zinc-700/60 ring-zinc-700/10"
              : "border-primary/30 ring-primary/10";

  const body = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-xl border border-primary/30 bg-zinc-900/90 p-2 text-primary shadow-[0_0_12px_-6px_hsl(var(--primary)/0.35)]">
          {icon}
        </span>
      </div>
      <div className="min-h-[2.25rem] text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {value}
      </div>
      {sublabel ? (
        <p className="mt-1 min-h-[2rem] text-[11px] leading-snug text-muted-foreground">{sublabel}</p>
      ) : (
        <p className="mt-1 min-h-[2rem]" aria-hidden />
      )}
    </>
  );

  const cardClass = cn(ADMIN_STAT_CARD_BTN, "h-full min-h-[8.5rem]", toneClass, className);

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClass}>
        {body}
      </button>
    );
  }

  return <div className={cn(cardClass, "cursor-default")}>{body}</div>;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        ok
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-200",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")}
        aria-hidden
      />
      {label}
    </span>
  );
}

function healthTone(status: AdminNocSystemHealthItem["status"]): "ok" | "warn" | "fail" | "muted" {
  if (status === "ok") return "ok";
  if (status === "warn") return "warn";
  if (status === "fail") return "fail";
  return "muted";
}

const HEALTH_ICONS: Record<AdminNocSystemHealthKey, LucideIcon> = {
  api: HeartPulse,
  websocket: Wifi,
  ram: MemoryStick,
  cpu: Cpu,
  database: Database,
  redis: Server,
  storage: HardDrive,
  push_worker: Radio,
  queue_worker: Workflow,
  p95_latency: Gauge,
};

function formatHealthValue(item: AdminNocSystemHealthItem): ReactNode {
  if (item.key === "cpu") return t("p8.admin.noc.cpu.waiting_host_metrics");
  if (item.key === "api") {
    const readyz = String(item.hintParams?.readyz ?? "ready");
    return (
      <StatusPill
        ok={readyz === "ready"}
        label={t(`p8.admin.noc.status.${readyz === "ready" ? "ready" : "not_ready"}`)}
      />
    );
  }
  if (item.value == null) return t("p8.admin.noc.dash");
  if (item.key === "ram") {
    return `${formatNumber(Number(item.value))} ${t("p8.admin.noc.mb_unit")}`;
  }
  if (item.key === "p95_latency" || item.key === "database" || item.key === "redis" || item.key === "storage") {
    return `${formatNumber(Math.round(Number(item.value)))} ${t("p8.admin.noc.ms_unit")}`;
  }
  return formatNumber(Number(item.value));
}

function formatHealthHint(item: AdminNocSystemHealthItem): string {
  const p = item.hintParams ?? {};
  switch (item.key) {
    case "api":
      return t("p8.admin.noc.health.hint.api", {
        healthz: String(p.healthz ?? "ok"),
        readyz: String(p.readyz ?? "ready"),
      });
    case "websocket":
      return t("p8.admin.noc.health.hint.ws", {
        users: formatNumber(Number(p.users ?? 0)),
        failures: formatNumber(Number(p.failures ?? 0)),
      });
    case "ram":
      return t("p8.admin.noc.metric.ram_hint", {
        used: formatNumber(Number(p.used ?? 0)),
        total: formatNumber(Number(p.total ?? 0)),
      });
    case "cpu":
      return t("p8.admin.noc.metric.cpu_hint");
    case "database":
      return t("p8.admin.noc.health.hint.database", { ms: formatNumber(Number(item.value ?? 0)) });
    case "redis":
      if (item.status === "unconfigured") return t("p8.admin.noc.health.hint.redis_unconfigured");
      return t("p8.admin.noc.health.hint.redis", {
        ms: formatNumber(Number(item.value ?? 0)),
        depth: formatNumber(Number(p.depth ?? 0)),
      });
    case "storage":
      if (item.status === "unconfigured") return t("p8.admin.noc.health.hint.storage_unconfigured");
      return t("p8.admin.noc.health.hint.storage", { ms: formatNumber(Number(item.value ?? 0)) });
    case "push_worker":
      if (item.status === "unconfigured") return t("p8.admin.noc.health.hint.push_unconfigured");
      return t("p8.admin.noc.health.hint.push_worker", { depth: formatNumber(Number(item.value ?? 0)) });
    case "queue_worker":
      if (item.status === "unconfigured") return t("p8.admin.noc.health.hint.redis_unconfigured");
      return t("p8.admin.noc.health.hint.queue_worker", { depth: formatNumber(Number(item.value ?? 0)) });
    case "p95_latency":
      return t("p8.admin.noc.health.hint.p95", {
        p50: formatNumber(Math.round(Number(p.p50 ?? 0))),
        count: formatNumber(Number(p.count ?? 0)),
      });
    default:
      return "";
  }
}

function actorRoleLabel(roleKey: AdminNocActivityItem["actor"]["roleKey"]): string {
  const key = `p8.admin.roles.${roleKey}.title`;
  const label = t(key);
  return label === key ? roleKey : label;
}

function formatActivityAction(item: AdminNocActivityItem): string {
  const actionI18nKey = `p8.admin.activity.actions.${item.actionKey}`;
  const params: Record<string, string> = {
    id: item.target?.id != null ? String(item.target.id) : "",
    key: item.actionKey,
    sellerName: item.context.sellerName || t("p8.admin.roles.user.title"),
    adTitle: item.context.adTitle || `#${item.target?.id ?? ""}`,
    userName: item.context.userName || `#${item.target?.id ?? ""}`,
  };
  const translated = t(actionI18nKey, params);
  if (translated !== actionI18nKey) return translated;
  return t("p8.admin.activity.actions.unknown", params);
}

function NeedsActionCard({
  item,
  onNavigate,
}: {
  item: AdminNocNeedsActionItem;
  onNavigate: (href: string) => void;
}) {
  const severityClass =
    item.severity === "critical"
      ? "border-red-500/45 bg-red-950/25 ring-red-500/15"
      : item.severity === "warning" && item.count > 0
        ? "border-amber-500/40 bg-amber-950/20 ring-amber-500/10"
        : "border-primary/25 bg-zinc-900/50 ring-primary/5";

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      className={cn(
        BTN_FIX,
        SUB_CARD,
        "flex h-full min-h-[4.5rem] cursor-pointer items-center justify-between gap-3 p-4 text-right",
        severityClass,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{t(item.labelKey)}</p>
        {!item.dataAvailable ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{t("p8.admin.needs_action.pending_backend")}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border px-2 text-sm font-bold tabular-nums",
          item.count > 0 && item.severity !== "info"
            ? "border-amber-500/45 bg-amber-500/15 text-amber-100"
            : "border-primary/30 bg-zinc-900/80 text-primary",
        )}
      >
        {formatNumber(item.count)}
      </span>
    </button>
  );
}

function PriorityItemRow({
  item,
  onNavigate,
}: {
  item: AdminNocPriorityItem;
  onNavigate: (href: string) => void;
}) {
  const isActionable = Boolean(item.href) && item.count > 0;
  const levelClass =
    item.level === "critical"
      ? "border-red-500/40 bg-red-950/20"
      : item.level === "warning"
        ? "border-amber-500/35 bg-amber-950/15"
        : "border-emerald-500/30 bg-emerald-950/10";

  const body = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t(item.labelKey)}</span>
      <span className="shrink-0 tabular-nums text-sm font-bold text-primary">{formatNumber(item.count)}</span>
    </>
  );

  if (isActionable && item.href) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.href!)}
        className={cn(
          BTN_FIX,
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-right transition hover:border-primary/45",
          levelClass,
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-right", levelClass)}>
      {body}
    </div>
  );
}

function PrioritySection({
  level,
  items,
  onNavigate,
}: {
  level: AdminNocPriorityLevel;
  items: AdminNocPriorityItem[];
  onNavigate: (href: string) => void;
}) {
  const titleKey =
    level === "critical"
      ? "p8.admin.priority.section.critical"
      : level === "warning"
        ? "p8.admin.priority.section.warning"
        : "p8.admin.priority.section.normal";

  const visible = items.filter((item) => {
    if (level === "normal") return item.count > 0 || item.key === "system_healthy";
    if (level === "critical") return item.count > 0;
    return item.dataAvailable && (item.count > 0 || item.key === "verification_queue");
  });

  return (
    <div className={cn(CARD_SHELL, "flex h-full flex-col p-4")}>
      <h3 className="mb-3 text-base font-semibold text-foreground">{t(titleKey)}</h3>
      <div className="flex flex-1 flex-col gap-2">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/20 bg-zinc-900/40 px-3 py-6 text-center text-sm text-muted-foreground">
            {t("p8.admin.priority.empty")}
          </p>
        ) : (
          visible.map((item) => <PriorityItemRow key={item.key} item={item} onNavigate={onNavigate} />)
        )}
      </div>
    </div>
  );
}

function ActivityFeedItem({
  item,
  onNavigate,
}: {
  item: AdminNocActivityItem;
  onNavigate: (href: string) => void;
}) {
  const actorLabel = actorRoleLabel(item.actor.roleKey);
  const actorLine =
    item.actor.displayName?.trim()
      ? `${item.actor.displayName.trim()}${item.actor.roleKey !== "founder" ? ` · ${actorLabel}` : ""}`
      : item.actor.roleKey === "user" && item.context.userName
        ? item.context.userName
        : item.actor.id != null
          ? `${actorLabel}${item.actor.roleKey === "founder" || item.actor.roleKey === "moderator" ? "" : ` #${item.actor.id}`}`
          : actorLabel;

  return (
    <button
      type="button"
      disabled={!item.href}
      onClick={() => item.href && onNavigate(item.href)}
      className={cn(
        BTN_FIX,
        "flex w-full flex-col gap-2 rounded-xl border border-primary/15 bg-zinc-900/45 p-3 text-right ring-1 ring-primary/5 sm:flex-row sm:items-start sm:gap-4",
        item.href ? "cursor-pointer hover:border-primary/35" : "cursor-default opacity-95",
      )}
    >
      <span className="shrink-0 font-mono text-xs tabular-nums text-primary">{formatTime(item.createdAt)}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{actorLine}</p>
        <p className="text-sm leading-relaxed text-foreground">{formatActivityAction(item)}</p>
        {item.reason ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/90">{t("p8.admin.noc.activity.reason")}</span>{" "}
            {item.reason}
          </p>
        ) : null}
      </div>
      {item.kind === "report_created" ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      ) : null}
    </button>
  );
}

export function DashboardHome({ data, isRefreshing = false }: DashboardHomeProps) {
  const [, navigate] = useLocation();
  const access = useAdminAccess();
  const activeUsersQuery = useAdminActiveAppUsersCount(access.can("system"));
  const noc: AdminNocSnapshot | null = data.noc ?? null;
  const live = noc?.liveSystemStatus;

  const onlineNow =
    activeUsersQuery.data != null && typeof activeUsersQuery.data.count === "number"
      ? activeUsersQuery.data.count
      : (noc?.userIntelligence.onlineNow ?? live?.onlineUsersNow ?? 0);

  if (!noc || !live || !noc.executiveHeader || !noc.userIntelligence) {
    return (
      <div className="rounded-2xl border border-amber-500/35 bg-amber-950/20 p-6 text-right text-amber-100" dir="rtl">
        <p className="font-medium">{t("p8.admin.noc.load_error_title")}</p>
        <p className="mt-2 text-sm text-amber-100/80">{t("p8.admin.noc.load_error_hint")}</p>
      </div>
    );
  }

  const { executiveHeader, userIntelligence, priorityItems, systemHealthGrid } = noc;
  const showSystem = access.can("system") && systemHealthGrid.length > 0;
  const showFounderBlocks = access.isFounder;
  const canUsers = access.can("users");
  const criticalItems = priorityItems.filter((item) => item.level === "critical");
  const warningItems = priorityItems.filter((item) => item.level === "warning");
  const normalItems = priorityItems.filter((item) => item.level === "normal");

  return (
    <div className="space-y-5" dir="rtl">
      <header className="rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12">
        <div className="mb-5 rounded-2xl border border-primary/35 bg-gradient-to-bl from-primary/[0.08] via-zinc-950/90 to-zinc-950/95 px-4 py-4 ring-1 ring-primary/12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 text-right">
              <p className="text-lg font-bold tracking-tight text-primary">
                {t("p8.admin.executive.company_badge")}
              </p>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{executiveHeader.companyName}</p>
              <p className="text-sm text-muted-foreground">{t("p8.admin.executive.ops_center")}</p>
            </div>
            <dl className="min-w-[14rem] space-y-2 rounded-xl border border-primary/25 bg-zinc-900/55 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("p8.admin.executive.founder_label")}</dt>
                <dd className="font-semibold text-foreground">{executiveHeader.founderName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("p8.admin.executive.role_label")}</dt>
                <dd className="font-medium text-primary">{t("p8.admin.roles.founder.title")}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-xl font-bold sm:text-2xl")}>
              {access.isFounder
                ? t("p8.admin.executive.dashboard_title")
                : t("p8.admin.dashboard.moderator_title", { name: access.displayName })}
            </h1>
              {isRefreshing ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {t("p8.admin.noc.refreshing")}
                </span>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {t("p8.admin.executive.last_updated")}{" "}
              <span className="font-mono tabular-nums text-primary">{formatTime(executiveHeader.lastUpdatedAt)}</span>
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t("p8.admin.executive.today_title")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: "users", label: t("p8.admin.executive.today_new_users"), value: executiveHeader.today.newUsers },
                  { key: "ads", label: t("p8.admin.executive.today_new_ads"), value: executiveHeader.today.newAds },
                  {
                    key: "reports",
                    label: t("p8.admin.executive.today_new_reports"),
                    value: executiveHeader.today.newReports,
                  },
                  {
                    key: "support",
                    label: t("p8.admin.executive.today_new_support"),
                    value: executiveHeader.today.newSupport,
                  },
                ].map((stat) => {
                  const clickable = canUsers && stat.key === "users";
                  const inner = (
                    <>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-primary">{formatNumber(stat.value)}</p>
                    </>
                  );
                  return clickable ? (
                    <button
                      key={stat.key}
                      type="button"
                      onClick={() => navigate("/admin/users")}
                      className={cn(
                        BTN_FIX,
                        "rounded-xl border border-primary/25 bg-zinc-900/55 px-3 py-2.5 text-right ring-1 ring-primary/8 hover:border-primary/45",
                      )}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div
                      key={stat.key}
                      className="rounded-xl border border-primary/25 bg-zinc-900/55 px-3 py-2.5 text-right ring-1 ring-primary/8"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            <p
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                executiveHeader.interventionCount > 0
                  ? "border-amber-500/40 bg-amber-950/25 text-amber-100"
                  : "border-emerald-500/35 bg-emerald-950/20 text-emerald-100",
              )}
            >
              {executiveHeader.interventionCount > 0
                ? t("p8.admin.executive.intervention", { count: formatNumber(executiveHeader.interventionCount) })
                : t("p8.admin.executive.intervention_none")}
            </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PrioritySection level="critical" items={criticalItems} onNavigate={navigate} />
        <PrioritySection level="warning" items={warningItems} onNavigate={navigate} />
        <PrioritySection level="normal" items={normalItems} onNavigate={navigate} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-right">
          <ShieldAlert className="h-5 w-5 text-amber-400" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.noc.section.needs_action")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {noc.needsActionNow.map((item) => (
            <NeedsActionCard key={item.key} item={item} onNavigate={navigate} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-right">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.noc.section.user_intelligence")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <NocMetricCard
            label={t("p8.admin.noc.metric.online_now")}
            value={formatNumber(onlineNow)}
            sublabel={t("p8.admin.noc.metric.online_now_hint")}
            icon={<Radio className="h-4 w-4" aria-hidden />}
            tone="live"
          />
          <NocMetricCard
            label={t("p8.admin.noc.metric.active_5m")}
            value={formatNumber(userIntelligence.activeLast5Minutes)}
            sublabel={t("p8.admin.noc.metric.active_5m_hint")}
            icon={<Clock3 className="h-4 w-4" aria-hidden />}
          />
          <NocMetricCard
            label={t("p8.admin.noc.metric.active_today")}
            value={formatNumber(userIntelligence.activeToday)}
            sublabel={t("p8.admin.noc.metric.active_today_hint")}
            icon={<Users className="h-4 w-4" aria-hidden />}
          />
          <NocMetricCard
            label={t("p8.admin.noc.metric.new_users_today")}
            value={formatNumber(userIntelligence.newUsersToday)}
            sublabel={t("p8.admin.noc.metric.new_users_today_hint")}
            icon={<UserPlus className="h-4 w-4" aria-hidden />}
            onClick={canUsers ? () => navigate("/admin/users") : undefined}
          />
          <NocMetricCard
            label={t("p8.admin.noc.metric.blocked_users")}
            value={formatNumber(userIntelligence.blockedUsers)}
            sublabel={t("p8.admin.noc.metric.blocked_users_hint")}
            icon={<Ban className="h-4 w-4" aria-hidden />}
            tone={userIntelligence.blockedUsers > 0 ? "warn" : "default"}
            onClick={canUsers ? () => navigate("/admin/users?status=banned") : undefined}
          />
          <NocMetricCard
            label={t("p8.admin.noc.metric.pending_verification")}
            value={formatNumber(userIntelligence.pendingVerification)}
            sublabel={t("p8.admin.noc.metric.pending_verification_hint")}
            icon={<UserCheck className="h-4 w-4" aria-hidden />}
            tone={userIntelligence.pendingVerification > 0 ? "warn" : "default"}
            onClick={canUsers ? () => navigate("/admin/users?status=unverified") : undefined}
          />
        </div>
      </section>

      {showSystem ? (
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-right">
          <Activity className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.noc.section.system_health_grid")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {systemHealthGrid.map((item) => {
            const Icon = HEALTH_ICONS[item.key];
            return (
              <NocMetricCard
                key={item.key}
                label={t(`p8.admin.noc.health.${item.key}`)}
                value={formatHealthValue(item)}
                sublabel={formatHealthHint(item)}
                icon={<Icon className="h-4 w-4" aria-hidden />}
                tone={healthTone(item.status)}
              />
            );
          })}
        </div>
      </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={cn(CARD_SHELL, "flex h-full flex-col p-4")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.noc.section.activity")}</h2>
            </div>
            {access.can("logs") ? (
            <button
              type="button"
              onClick={() => navigate("/admin/logs")}
              className={cn(
                BTN_FIX,
                "cursor-pointer text-sm font-medium text-primary transition-colors hover:underline",
              )}
            >
              {t("p8.admin.noc.activity.full_log")}
            </button>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {noc.recentActivity.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-zinc-900/40 p-6 text-center text-sm text-muted-foreground">
                {t("p8.admin.noc.activity.empty")}
              </div>
            ) : (
              noc.recentActivity.slice(0, 8).map((item) => (
                <ActivityFeedItem key={item.id} item={item} onNavigate={navigate} />
              ))
            )}
          </div>
        </section>

        <section className={cn(CARD_SHELL, "flex h-full flex-col p-4")}>
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.noc.section.queue")}</h2>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {noc.queueCenter.map((queue) => (
              <button
                key={queue.key}
                type="button"
                onClick={() => navigate(queue.href)}
                className={cn(
                  BTN_FIX,
                  SUB_CARD,
                  "flex h-full min-h-[4.5rem] cursor-pointer items-center justify-between gap-3 p-4 text-right ring-1 ring-primary/10 transition hover:border-primary/45",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{t(queue.labelKey)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("p8.admin.noc.queue.open")}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border px-2 text-sm font-bold tabular-nums",
                    queue.count > 0
                      ? "border-amber-500/45 bg-amber-500/15 text-amber-100"
                      : "border-primary/30 bg-zinc-900/80 text-primary",
                  )}
                >
                  {formatNumber(queue.count)}
                </span>
              </button>
            ))}
          </div>
          {access.can("analytics") ? (
          <div className="mt-4 flex justify-center border-t border-primary/15 pt-4">
            <button
              type="button"
              onClick={() => navigate("/admin/analytics")}
              className={cn(
                AUTH_ACCENT_OUTLINE_BTN,
                BTN_FIX,
                "w-full max-w-md cursor-pointer hover:bg-zinc-900 active:scale-[0.98] sm:w-auto",
              )}
            >
              {t("p8.admin.noc.stats_link")}
            </button>
          </div>
          ) : null}
        </section>
      </div>

      {showFounderBlocks ? (
      <div className="space-y-4">
        <a
          href="/admin/operations"
          className={cn(CARD_SHELL, "flex items-center justify-between px-4 py-3 text-right transition hover:border-primary/50")}
        >
          <span className="text-sm font-semibold text-foreground">Operations Queue Intelligence — Founder</span>
          <Workflow className="h-5 w-5 text-primary" aria-hidden />
        </a>
        <a
          href="/admin/monitoring"
          className={cn(CARD_SHELL, "flex items-center justify-between px-4 py-3 text-right transition hover:border-primary/50")}
        >
          <span className="text-sm font-semibold text-foreground">Monitoring + Observability — Founder</span>
          <Activity className="h-5 w-5 text-primary" aria-hidden />
        </a>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <NotificationCenterFoundation />
        <RolesPermissionsFoundation />
      </div>
      </div>
      ) : null}
    </div>
  );
}

import { Link, Redirect } from "wouter";
import {
  AlertTriangle,
  BellRing,
  KeyRound,
  LogIn,
  Monitor,
  Shield,
  Smartphone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { SecurityEventMeta } from "@/components/security-event-meta";
import {
  resolveSecurityListViewState,
  SecurityEventsListSkeleton,
} from "@/components/security-events-list-skeleton";
import { cn } from "@/lib/utils";
import {
  fetchUserSecurityAlerts,
  type SecurityAlertSeverity,
  type UserSecurityAlertDto,
} from "@/lib/user-security-alerts-api";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export const userSecurityAlertsQueryKey = () => ["account", "security-alerts"] as const;

function alertTitle(eventType: string): string {
  const key = `settings.security_alerts.event.${eventType.replace(/\./g, "_")}`;
  const translated = t(key);
  return translated !== key ? translated : eventType;
}

function alertDescription(alert: UserSecurityAlertDto): string {
  const key = `settings.security_alerts.desc.${alert.eventType.replace(/\./g, "_")}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return alertTitle(alert.eventType);
}

function severityStyles(severity: SecurityAlertSeverity): {
  ring: string;
  icon: string;
  badge: string;
} {
  if (severity === "critical") {
    return {
      ring: "border-red-500/35 bg-red-950/25 ring-red-500/20",
      icon: "text-red-300",
      badge: "border-red-500/40 bg-red-950/40 text-red-100",
    };
  }
  if (severity === "warning") {
    return {
      ring: "border-amber-500/35 bg-amber-950/20 ring-amber-500/20",
      icon: "text-amber-300",
      badge: "border-amber-500/40 bg-amber-950/35 text-amber-100",
    };
  }
  return {
    ring: "border-lime-400/30 bg-lime-500/5 ring-lime-400/15",
    icon: "text-lime-300",
    badge: "border-lime-400/35 bg-lime-500/10 text-lime-100",
  };
}

function AlertIcon({ eventType, className }: { eventType: string; className?: string }) {
  const props = { className: cn("h-4 w-4", className), strokeWidth: 2.25, "aria-hidden": true as const };
  if (eventType.startsWith("login")) return <LogIn {...props} />;
  if (eventType.startsWith("2fa")) return <KeyRound {...props} />;
  if (eventType === "password.change") return <Shield {...props} />;
  if (eventType === "device.revoke") return <Smartphone {...props} />;
  if (eventType.startsWith("session")) return <Monitor {...props} />;
  return <BellRing {...props} />;
}

function AlertRow({
  alert,
  locale,
  textDir,
}: {
  alert: UserSecurityAlertDto;
  locale: string;
  textDir: "rtl" | "ltr";
}) {
  const styles = severityStyles(alert.severity);

  return (
    <article className="px-3 py-3 md:px-4" dir={textDir}>
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border p-3 ring-1",
          styles.ring,
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-[#0A0A0A]/80",
            styles.icon,
          )}
        >
          <AlertIcon eventType={alert.eventType} />
        </div>
        <div className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-foreground">{alertTitle(alert.eventType)}</p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                styles.badge,
              )}
            >
              {t(`settings.security_alerts.severity.${alert.severity}`)}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground/95">
            {alertDescription(alert)}
          </p>
          <SecurityEventMeta
            createdAt={alert.createdAt}
            locale={locale}
            userAgent={alert.userAgent}
            deviceHint={alert.deviceHint}
          />
        </div>
      </div>
    </article>
  );
}

export default function AccountSecurityAlerts() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";

  const alertsQuery = useQuery({
    queryKey: userSecurityAlertsQueryKey(),
    queryFn: () => fetchUserSecurityAlerts(),
    enabled: Boolean(user),
  });

  const { items: alerts, loading, empty } = resolveSecurityListViewState({
    authLoading,
    user,
    data: alertsQuery.data,
    isPending: alertsQuery.isPending,
    isFetching: alertsQuery.isFetching,
    isError: alertsQuery.isError,
  });

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security/alerts" />;
  }

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("settings.ia.security.security_alerts")} backFallback="/account/security" />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <section className={SETTINGS_CARD}>
          <div className={`${SETTINGS_CARD_SHELL} border-b border-zinc-800/80 px-3 py-3 md:px-4`}>
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-lime-400" aria-hidden />
              <h2 className="text-[15px] font-semibold text-foreground">
                {t("settings.security_alerts.section_title")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/90">
              {t("settings.security_alerts.section_hint")}
            </p>
          </div>

          {loading ? (
            <SecurityEventsListSkeleton variant="alerts" />
          ) : alertsQuery.isError ? (
            <div className="px-4 py-8 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{t("settings.security_alerts.load_failed")}</p>
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-400/25 bg-lime-500/5 ring-1 ring-lime-400/15">
                <Shield className="h-7 w-7 text-lime-300" aria-hidden />
              </div>
              <p className="text-[15px] font-semibold text-foreground">
                {t("settings.security_alerts.empty_title")}
              </p>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                {t("settings.security_alerts.empty_body")}
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} locale={locale} textDir={textDir} />
              ))}
            </div>
          )}

          <div className="border-t border-zinc-800/80 px-3 py-3 md:px-4">
            <Link href="/account/security/log">
              <span className={cn(SETTINGS_OUTLINE_BUTTON, "inline-flex w-full justify-center text-sm")}>
                {t("settings.security_alerts.view_full_log")}
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

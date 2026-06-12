import { Redirect } from "wouter";
import { ScrollText, Shield } from "lucide-react";
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
import { fetchUserSecurityLog, type UserSecurityEventDto } from "@/lib/user-security-log-api";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export const userSecurityLogQueryKey = () => ["account", "security-log"] as const;

function eventLabel(eventType: string): string {
  const key = `settings.security_log.event.${eventType.replace(/\./g, "_")}`;
  const translated = t(key);
  return translated !== key ? translated : eventType;
}

function EventRow({ event, locale, textDir }: { event: UserSecurityEventDto; locale: string; textDir: "rtl" | "ltr" }) {
  return (
    <article className="px-3 py-3 md:px-4" dir={textDir}>
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary">
          <Shield className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-[15px] font-semibold text-foreground">{eventLabel(event.eventType)}</p>
          <SecurityEventMeta
            createdAt={event.createdAt}
            locale={locale}
            userAgent={event.userAgent}
            className="mt-0.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground/90"
          />
        </div>
      </div>
    </article>
  );
}

export default function AccountSecurityLog() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";

  const logQuery = useQuery({
    queryKey: userSecurityLogQueryKey(),
    queryFn: () => fetchUserSecurityLog(),
    enabled: Boolean(user),
  });

  const { items: events, loading, empty } = resolveSecurityListViewState({
    authLoading,
    user,
    data: logQuery.data,
    isPending: logQuery.isPending,
    isFetching: logQuery.isFetching,
    isError: logQuery.isError,
  });

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security/log" />;
  }

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("settings.ia.security.security_log")} backFallback="/account/security" />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <section className={SETTINGS_CARD}>
          <div className={`${SETTINGS_CARD_SHELL} border-b border-zinc-800/80 px-3 py-3 md:px-4`}>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-[15px] font-semibold text-foreground">
                {t("settings.security_log.section_title")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/90">{t("settings.security_log.section_hint")}</p>
          </div>

          {loading ? (
            <SecurityEventsListSkeleton variant="log" className="px-1" />
          ) : logQuery.isError ? (
            <p className="px-4 py-6 text-center text-sm text-destructive">
              {t("settings.security_log.load_failed")}
            </p>
          ) : empty ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("settings.security_log.empty")}
            </p>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {events.map((event) => (
                <EventRow key={event.id} event={event} locale={locale} textDir={textDir} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

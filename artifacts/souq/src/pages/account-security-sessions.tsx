import { useCallback, useState } from "react";
import { Redirect } from "wouter";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  fetchUserSessions,
  revokeOtherUserSessions,
  revokeUserSession,
  UserSessionsApiError,
  type UserSessionDto,
} from "@/lib/user-sessions-api";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_CARD_TITLE,
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export const userSessionsQueryKey = () => ["account", "sessions"] as const;

function formatSessionExpiry(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale === "de" ? "de" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SessionRow({
  session,
  textDir,
  revoking,
  onRevoke,
}: {
  session: UserSessionDto;
  textDir: "rtl" | "ltr";
  revoking: boolean;
  onRevoke?: () => void;
}) {
  const { locale } = useLocale();
  const label = session.isCurrent
    ? t("settings.sessions.current_device")
    : t("settings.sessions.unknown_device");

  return (
    <article className="px-3 py-3 md:px-4" dir={textDir}>
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary">
          {session.isCurrent ? (
            <Smartphone className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          ) : (
            <Monitor className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-[15px] font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/90">
            {t("settings.sessions.expires_label")}: {formatSessionExpiry(session.expiresAt, locale)}
          </p>
        </div>
        {session.isCurrent ? (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {t("settings.sessions.current_badge")}
          </span>
        ) : null}
      </div>
      {!session.isCurrent && onRevoke ? (
        <div className="mt-2.5">
          <button
            type="button"
            disabled={revoking}
            onClick={onRevoke}
            className={cn(
              SETTINGS_OUTLINE_BUTTON,
              "!min-h-10 w-full border-destructive/40 py-2 text-xs text-destructive-foreground sm:w-auto",
            )}
          >
            {revoking ? "…" : t("settings.sessions.revoke_one")}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default function AccountSecuritySessions() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false);
  const [revokeOthersPending, setRevokeOthersPending] = useState(false);

  const {
    data: sessions = [],
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: userSessionsQueryKey(),
    queryFn: fetchUserSessions,
    enabled: Boolean(user),
  });

  const loadErrorMessage = (() => {
    if (!isError || !error) return t("settings.sessions.load_failed");
    if (error instanceof UserSessionsApiError) {
      if (error.status === 404) return t("settings.sessions.load_failed_missing_api");
      if (error.status === 401 || error.status === 403) return t("settings.sessions.load_failed_auth");
    }
    return t("settings.sessions.load_failed");
  })();

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security/sessions" />;
  }

  const textDir = locale === "ar" ? "rtl" : "ltr";
  const loading = isPending && sessions.length === 0;
  const currentSession = sessions.find((s) => s.isCurrent) ?? sessions[0];
  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const hasOthers = otherSessions.length > 0;

  const refreshSessions = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userSessionsQueryKey() });
  }, [queryClient]);

  const handleRevokeOne = useCallback(
    async (sessionId: string) => {
      setRevokingId(sessionId);
      try {
        await revokeUserSession(sessionId);
        await refreshSessions();
        toast({ title: t("settings.sessions.revoke_success") });
      } catch {
        toast({ title: t("settings.sessions.revoke_failed"), variant: "destructive" });
      } finally {
        setRevokingId(null);
      }
    },
    [refreshSessions, toast],
  );

  const handleRevokeOthers = useCallback(async () => {
    setRevokeOthersPending(true);
    try {
      const revoked = await revokeOtherUserSessions();
      setRevokeOthersOpen(false);
      await refreshSessions();
      toast({
        title:
          revoked > 0
            ? t("settings.sessions.revoke_others_success", { count: revoked })
            : t("settings.sessions.revoke_others_none"),
      });
    } catch {
      toast({ title: t("settings.sessions.revoke_failed"), variant: "destructive" });
    } finally {
      setRevokeOthersPending(false);
    }
  }, [refreshSessions, toast]);

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader
        title={t("settings.ia.security.active_sessions")}
        backFallback="/account/security"
      />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        {loading || (isFetching && sessions.length === 0) ? (
          <div className={`${SETTINGS_CARD} flex min-h-[12rem] items-center justify-center`}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : isError ? (
          <div className={`${SETTINGS_CARD} px-4 py-6 text-center`} dir={textDir}>
            <p className="text-sm leading-relaxed text-muted-foreground">{loadErrorMessage}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(SETTINGS_OUTLINE_BUTTON, "mt-4 !min-h-10 px-4 text-xs")}
            >
              {t("settings.sessions.retry")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <section>
              <h2 className={`${SETTINGS_CARD_TITLE} mb-2 px-0.5`}>
                {t("settings.sessions.current_section")}
              </h2>
              <div className={SETTINGS_CARD_SHELL}>
                {currentSession ? (
                  <SessionRow session={currentSession} textDir={textDir} revoking={false} />
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground" dir={textDir}>
                    {t("settings.sessions.current_device")}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className={`${SETTINGS_CARD_TITLE} mb-2 px-0.5`}>
                {t("settings.sessions.others_section")}
              </h2>
              {hasOthers ? (
                <div className={`${SETTINGS_CARD_SHELL} overflow-hidden`}>
                  {otherSessions.map((session, index) => (
                    <div
                      key={session.sessionId}
                      className={index < otherSessions.length - 1 ? "border-b border-primary/10" : ""}
                    >
                      <SessionRow
                        session={session}
                        textDir={textDir}
                        revoking={revokingId === session.sessionId}
                        onRevoke={() => void handleRevokeOne(session.sessionId)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${SETTINGS_CARD} px-4 py-6 text-center text-sm text-muted-foreground`} dir={textDir}>
                  {t("settings.sessions.empty_others")}
                </div>
              )}
            </section>

            {hasOthers ? (
              <Button
                type="button"
                variant="outline"
                disabled={revokeOthersPending}
                onClick={() => setRevokeOthersOpen(true)}
                className="h-11 w-full rounded-xl border border-destructive/35 bg-destructive/10 text-sm font-semibold text-destructive-foreground hover:bg-destructive/15"
              >
                {t("settings.sessions.revoke_others")}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <AlertDialog open={revokeOthersOpen} onOpenChange={(open) => !revokeOthersPending && setRevokeOthersOpen(open)}>
        <AlertDialogContent
          dir={textDir}
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "fixed left-[50%] top-[50%] z-50 flex max-h-[min(90vh,680px)] w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
          )}
        >
          <div className="max-h-[min(90vh,680px)] overflow-y-auto px-5 pb-5 pt-5 md:px-6">
            <AlertDialogTitle className="text-right text-base font-bold text-foreground md:text-lg">
              {t("settings.sessions.revoke_others_confirm_title")}
            </AlertDialogTitle>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("settings.sessions.revoke_others_confirm_body")}
            </p>
            <div
              className={cn(
                "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3",
                locale !== "ar" && "sm:flex-row-reverse",
              )}
            >
              <AlertDialogCancel asChild disabled={revokeOthersPending}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-w-[7rem] rounded-xl border-primary/35 bg-[#0A0A0A]/80"
                >
                  {t("settings.sessions.cancel")}
                </Button>
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={revokeOthersPending}
                onClick={() => void handleRevokeOthers()}
                className="inline-flex h-11 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-red-500/45 bg-red-950/55 font-semibold text-red-100 hover:bg-red-950/75"
              >
                {revokeOthersPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    {t("settings.sessions.working")}
                  </>
                ) : (
                  t("settings.sessions.revoke_others_confirm_action")
                )}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

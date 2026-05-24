import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { apiUrl } from "@/lib/api-url";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import {
  SETTINGS_CARD,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export type NotificationPrefsDto = {
  notifyMessages: boolean;
  notifyAdModeration: boolean;
  notifySupport: boolean;
  notifyReports: boolean;
  notifyAnnouncements: boolean;
  notifyFavorites: boolean;
  pushEnabled: boolean;
};

const queryKey = ["account", "notification-preferences"] as const;

async function fetchPrefs(): Promise<NotificationPrefsDto> {
  const res = await fetch(apiUrl("/api/account/notification-preferences"), {
    credentials: "include",
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<NotificationPrefsDto>;
}

async function patchPrefs(patch: Partial<NotificationPrefsDto>): Promise<NotificationPrefsDto> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  const res = await fetch(apiUrl("/api/account/notification-preferences"), {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<NotificationPrefsDto>;
}

function Row({
  label,
  hint,
  checked,
  disabled,
  isRtl,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  isRtl: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-primary/10 py-4 last:border-b-0",
      )}
    >
      <div className={cn("min-w-0 flex-1", isRtl ? "text-right" : "text-left")}>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className={cn(SETTINGS_LABEL, "mt-1 text-zinc-500")}>{hint}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
        aria-label={label}
      />
    </div>
  );
}

export default function AccountNotifications() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const q = useQuery<NotificationPrefsDto, Error>({
    queryKey,
    queryFn: fetchPrefs,
    enabled: !!user,
    retry: 1,
  });

  const refetchPrefs = () =>
    void queryClient.fetchQuery({ queryKey, queryFn: fetchPrefs });

  const mut = useMutation({
    mutationFn: patchPrefs,
    onSuccess: async (data) => {
      await queryClient.setQueryData(queryKey, data);
      toast({ title: t("account_notifications.saved") });
    },
    onError: () => {
      toast({
        title: t("account_notifications.error"),
        variant: "destructive",
      });
    },
  });

  const push = usePushNotifications(!!user && !authLoading);

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/notifications" />;
  }

  if (!user) {
    return (
      <div
        className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM, "flex min-h-[100dvh] flex-col")}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <AccountHeader title={t("account_notifications.title")} />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("account_notifications.loading_auth")}
          </p>
        </div>
      </div>
    );
  }

  const prefs = q.data;
  const showPrefsLoading = q.isPending && !q.isError;
  const errStatus =
    q.error instanceof Error && /^[0-9]{3}$/.test(q.error.message)
      ? Number(q.error.message)
      : null;

  const update = (patch: Partial<NotificationPrefsDto>) => {
    mut.mutate(patch);
  };

  return (
    <div
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM, "min-h-[100dvh]")}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AccountHeader title={t("account_notifications.title")} />
      <div className={SETTINGS_MAIN_COLUMN}>
        <p className="text-sm leading-relaxed text-zinc-500">
          {t("account_notifications.intro")}
        </p>

        <div className={cn(SETTINGS_CARD, "mb-4")}>
          <div className="flex items-start gap-3 border-b border-primary/10 pb-4">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className={cn("min-w-0 flex-1", isRtl ? "text-right" : "text-left")}>
              <p className="text-sm font-medium text-foreground">{t("account_notifications.push_title")}</p>
              <p className={cn(SETTINGS_LABEL, "mt-1 text-zinc-500")}>
                {t("account_notifications.push_hint")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {push.support === "unsupported"
                  ? t("account_notifications.push_unsupported")
                  : push.support === "denied"
                    ? t("account_notifications.push_denied")
                    : push.status?.subscribed
                      ? t("account_notifications.push_subscribed")
                      : t("account_notifications.push_not_subscribed")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {push.support === "default" || push.support === "granted" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={mut.isPending}
                    onClick={() => {
                      void push.subscribe().then((result) => {
                        if (result === "subscribed") {
                          toast({ title: t("account_notifications.push_enabled_toast") });
                        } else if (result === "denied") {
                          toast({
                            title: t("account_notifications.push_denied_toast"),
                            variant: "destructive",
                          });
                        } else if (result === "not-configured") {
                          toast({
                            title: t("account_notifications.push_not_configured"),
                            variant: "destructive",
                          });
                        }
                      });
                    }}
                  >
                    {t("account_notifications.push_enable_btn")}
                  </Button>
                ) : null}
                {push.status?.subscribed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void push.unsubscribe().then(() => {
                        toast({ title: t("account_notifications.push_disabled_toast") });
                      });
                    }}
                  >
                    {t("account_notifications.push_disable_btn")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {prefs ? (
            <Row
              label={t("account_notifications.push_master")}
              hint={t("account_notifications.push_master_hint")}
              checked={prefs.pushEnabled}
              disabled={mut.isPending}
              isRtl={isRtl}
              onCheckedChange={(v) => update({ pushEnabled: v })}
            />
          ) : null}
        </div>

        <div className={cn(SETTINGS_CARD, "relative")}>
          {showPrefsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : q.isError ? (
            <div
              className={cn(
                "flex flex-col items-center gap-4 px-4 py-8 text-center",
                isRtl ? "text-right" : "text-left",
              )}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("account_notifications.load_failed")}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {errStatus === 401
                      ? t("account_notifications.session_expired_hint")
                      : t("account_notifications.load_failed_hint")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={refetchPrefs}>
                  {t("account_notifications.retry")}
                </Button>
                {errStatus === 401 ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href="/login">{t("account_notifications.go_login")}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : prefs ? (
            <>
              <Row
                label={t("account_notifications.messages")}
                hint={t("account_notifications.messages_hint")}
                checked={prefs.notifyMessages}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifyMessages: v })}
              />
              <Row
                label={t("account_notifications.ad_moderation")}
                hint={t("account_notifications.ad_moderation_hint")}
                checked={prefs.notifyAdModeration}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifyAdModeration: v })}
              />
              <Row
                label={t("account_notifications.favorites")}
                hint={t("account_notifications.favorites_hint")}
                checked={prefs.notifyFavorites}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifyFavorites: v })}
              />
              <Row
                label={t("account_notifications.support")}
                hint={t("account_notifications.support_hint")}
                checked={prefs.notifySupport}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifySupport: v })}
              />
              <Row
                label={t("account_notifications.reports")}
                hint={t("account_notifications.reports_hint")}
                checked={prefs.notifyReports}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifyReports: v })}
              />
              <Row
                label={t("account_notifications.announcements")}
                hint={t("account_notifications.announcements_hint")}
                checked={prefs.notifyAnnouncements}
                disabled={mut.isPending}
                isRtl={isRtl}
                onCheckedChange={(v) => update({ notifyAnnouncements: v })}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t("account_notifications.unexpected_empty")}</p>
              <Button type="button" variant="secondary" size="sm" onClick={refetchPrefs}>
                {t("account_notifications.retry")}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-600">
          {t("account_notifications.footer")}
        </p>
      </div>
    </div>
  );
}

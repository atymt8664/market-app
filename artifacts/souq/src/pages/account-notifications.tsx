import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  SETTINGS_CARD,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_HUB_TOGGLE_ROW,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
  SETTINGS_ROW_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { NotificationPrefsApiError } from "@/lib/notification-preferences-api";
import { useCallback, useState } from "react";

function ToggleRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className={SETTINGS_HUB_TOGGLE_ROW}>
      <p className={cn("min-w-0 flex-1 text-right", SETTINGS_HUB_LIST_ROW_LABEL)}>{label}</p>
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
  const prefsHook = useNotificationPreferences(!!user && !authLoading);
  const push = usePushNotifications(!!user && !authLoading);
  const [deviceBusy, setDeviceBusy] = useState(false);

  const handleDeviceToggle = useCallback(
    async (next: boolean) => {
      if (deviceBusy || prefsHook.isSaving) return;
      setDeviceBusy(true);
      try {
        if (next) {
          const result = await push.subscribe();
          if (result === "subscribed") {
            await prefsHook.saveSilent({ pushEnabled: true });
            toast({ title: t("account_notifications.device_enabled_toast") });
          } else if (result === "denied") {
            toast({
              title: t("account_notifications.permission_denied_toast"),
              variant: "destructive",
            });
          } else if (result === "not-configured") {
            toast({
              title: t("account_notifications.push_not_configured"),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("account_notifications.device_enable_error"),
              variant: "destructive",
            });
          }
        } else {
          await push.unsubscribe();
          await prefsHook.saveSilent({ pushEnabled: false });
          toast({ title: t("account_notifications.device_disabled_toast") });
        }
      } catch {
        toast({
          title: t("account_notifications.error"),
          variant: "destructive",
        });
      } finally {
        setDeviceBusy(false);
      }
    },
    [deviceBusy, prefsHook, push, toast],
  );

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/notifications" />;
  }

  if (!user) {
    return (
      <div
        className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)}
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

  const prefs = prefsHook.prefs;
  const errStatus =
    prefsHook.error instanceof NotificationPrefsApiError
      ? prefsHook.error.status
      : prefsHook.error instanceof Error && /^[0-9]{3}$/.test(prefsHook.error.message)
        ? Number(prefsHook.error.message)
        : null;

  const deviceOn = Boolean(push.status?.subscribed && prefs?.pushEnabled);
  const browserUnsupported = push.support === "unsupported" || push.support === "insecure";
  const permissionDenied = push.support === "denied";
  const deviceToggleDisabled =
    deviceBusy || prefsHook.isSaving || push.isLoading || !prefs || browserUnsupported || permissionDenied;

  const deviceHint = browserUnsupported
    ? t("account_notifications.device_hint_unsupported")
    : permissionDenied
      ? t("account_notifications.device_hint_blocked")
      : null;

  const categoryRows = prefs
    ? [
        { key: "messages", label: t("account_notifications.messages"), field: "notifyMessages" as const },
        { key: "ad_moderation", label: t("account_notifications.ad_moderation"), field: "notifyAdModeration" as const },
        { key: "favorites", label: t("account_notifications.favorites"), field: "notifyFavorites" as const },
        { key: "support", label: t("account_notifications.support"), field: "notifySupport" as const },
        { key: "reports", label: t("account_notifications.reports"), field: "notifyReports" as const },
        { key: "announcements", label: t("account_notifications.announcements"), field: "notifyAnnouncements" as const },
      ]
    : [];

  return (
    <div
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AccountHeader title={t("account_notifications.title")} />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <div className={SETTINGS_CARD}>
          {prefsHook.isLoading || push.isLoading || !prefs ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
            </div>
          ) : prefsHook.isError ? (
            <div className="flex flex-col items-center gap-4 px-2 py-8 text-center">
              <div className="flex items-start gap-3 text-right">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
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
                <Button type="button" variant="secondary" size="sm" onClick={() => void prefsHook.refetch()}>
                  {t("account_notifications.retry")}
                </Button>
                {errStatus === 401 ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href="/login">{t("account_notifications.go_login")}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <ToggleRow
                label={t("account_notifications.device_toggle_label")}
                checked={deviceOn}
                disabled={deviceToggleDisabled}
                onCheckedChange={(v) => {
                  void handleDeviceToggle(v);
                }}
              />

              {deviceHint ? (
                <p className="mt-1 text-right text-xs leading-relaxed text-zinc-500" data-testid="device-hint">
                  {deviceHint}
                </p>
              ) : null}

              {deviceBusy ? (
                <p className="mt-2 flex items-center justify-end gap-2 text-right text-xs text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                  {t("account_notifications.device_working")}
                </p>
              ) : null}

              <Link
                href="/account/notifications/quiet-hours"
                className={cn(SETTINGS_ROW_BUTTON, "mt-3 border-t border-primary/10 pt-3")}
              >
                <p className={cn("min-w-0 flex-1 text-right", SETTINGS_HUB_LIST_ROW_LABEL)}>
                  {t("account_notifications.quiet_hours_link")}
                </p>
                <ChevronLeft className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
              </Link>

              <div className="mt-3 border-t border-primary/10 pt-1">
                {categoryRows.map((row) => (
                  <ToggleRow
                    key={row.key}
                    label={row.label}
                    checked={prefs[row.field]}
                    disabled={prefsHook.isSaving}
                    onCheckedChange={(v) => prefsHook.update({ [row.field]: v })}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  SETTINGS_CARD,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_ROW_BUTTON,
  SETTINGS_SECTION_TITLE,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bell,
  ChevronLeft,
  Heart,
  Loader2,
  MessageSquare,
  Moon,
  Shield,
  Sparkles,
} from "lucide-react";
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
    <div className="flex items-center justify-between gap-4 py-1">
      <p className="min-w-0 flex-1 text-right text-sm font-semibold text-foreground">{label}</p>
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

function CategoryRow({
  icon,
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-primary/10 py-4 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-start gap-3 text-right">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-[#0A0A0A]/80 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.35)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className={cn(SETTINGS_LABEL, "mt-1 text-zinc-500")}>{hint}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-1 shrink-0"
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
    deviceBusy || prefsHook.isSaving || push.isLoading || !prefs || browserUnsupported;

  return (
    <div
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM, "flex min-h-[100dvh] flex-col")}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AccountHeader title={t("account_notifications.title")} />
      <div className={cn(SETTINGS_MAIN_COLUMN, "space-y-6")}>
        <p className="text-right text-sm leading-relaxed text-zinc-400">
          {t("account_notifications.intro")}
        </p>

        <section aria-labelledby="alerts-heading" className="space-y-2.5">
          <div className="text-right">
            <h2 id="alerts-heading" className={SETTINGS_SECTION_TITLE}>
              {t("account_notifications.alerts_section")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              {t("account_notifications.alerts_section_hint")}
            </p>
          </div>
          <div className={SETTINGS_CARD}>
            {prefs ? (
              <ToggleRow
                label={t("account_notifications.main_toggle")}
                checked={deviceOn}
                disabled={deviceToggleDisabled}
                onCheckedChange={(v) => {
                  void handleDeviceToggle(v);
                }}
              />
            ) : (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              </div>
            )}

            {deviceBusy ? (
              <p className="mt-3 flex items-center justify-end gap-2 text-right text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                {t("account_notifications.device_working")}
              </p>
            ) : null}

            {browserUnsupported ? (
              <div className="mt-4 space-y-1.5 text-right">
                <p className="text-sm text-zinc-400">{t("account_notifications.unsupported_message")}</p>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {t("account_notifications.unsupported_hint")}
                </p>
              </div>
            ) : null}

            {permissionDenied ? (
              <p className="mt-4 text-right text-xs leading-relaxed text-zinc-500">
                {t("account_notifications.permission_denied_hint")}
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <div className={cn(SETTINGS_CARD, "relative")}>
            {prefsHook.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : prefsHook.isError ? (
              <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
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
            ) : prefs ? (
              <>
                <CategoryRow
                  icon={<MessageSquare aria-hidden />}
                  label={t("account_notifications.messages")}
                  hint={t("account_notifications.messages_hint")}
                  checked={prefs.notifyMessages}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifyMessages: v })}
                />
                <CategoryRow
                  icon={<Bell aria-hidden />}
                  label={t("account_notifications.ad_moderation")}
                  hint={t("account_notifications.ad_moderation_hint")}
                  checked={prefs.notifyAdModeration}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifyAdModeration: v })}
                />
                <CategoryRow
                  icon={<Heart aria-hidden />}
                  label={t("account_notifications.favorites")}
                  hint={t("account_notifications.favorites_hint")}
                  checked={prefs.notifyFavorites}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifyFavorites: v })}
                />
                <CategoryRow
                  icon={<Shield aria-hidden />}
                  label={t("account_notifications.support")}
                  hint={t("account_notifications.support_hint")}
                  checked={prefs.notifySupport}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifySupport: v })}
                />
                <CategoryRow
                  icon={<AlertCircle aria-hidden />}
                  label={t("account_notifications.reports")}
                  hint={t("account_notifications.reports_hint")}
                  checked={prefs.notifyReports}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifyReports: v })}
                />
                <CategoryRow
                  icon={<Sparkles aria-hidden />}
                  label={t("account_notifications.announcements")}
                  hint={t("account_notifications.announcements_hint")}
                  checked={prefs.notifyAnnouncements}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ notifyAnnouncements: v })}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">{t("account_notifications.unexpected_empty")}</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => void prefsHook.refetch()}>
                  {t("account_notifications.retry")}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="quiet-hours-heading">
          <div className={SETTINGS_CARD}>
            <Link href="/account/notifications/quiet-hours" className={SETTINGS_ROW_BUTTON}>
              <div className="flex min-w-0 flex-1 items-center gap-3 text-right">
                <Moon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p id="quiet-hours-heading" className="text-sm font-medium text-foreground">
                    {t("account_notifications.quiet_hours_link")}
                  </p>
                  <p className={cn(SETTINGS_LABEL, "mt-0.5 text-zinc-500")}>
                    {t("account_notifications.quiet_hours_link_hint")}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

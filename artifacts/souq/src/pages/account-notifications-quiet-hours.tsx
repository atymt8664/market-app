import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  SETTINGS_CARD,
  SETTINGS_FIELD,
  SETTINGS_HUB_LIST_ROW_HINT,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_HUB_TOGGLE_ROW,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_LABEL,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import { Loader2, Moon } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";

function formatTimeDisplay(hm: string, locale: string): string {
  const [h, m] = hm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function AccountNotificationsQuietHours() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const prefsHook = useNotificationPreferences(!!user && !authLoading);

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/notifications/quiet-hours" />;
  }

  if (!user) {
    return (
      <div
        className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <AccountHeader title={t("account_notifications.quiet_hours_title")} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      </div>
    );
  }

  const prefs = prefsHook.prefs;

  const onTimeChange = (field: "quietHoursStart" | "quietHoursEnd", value: string) => {
    if (!value) return;
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : prefs?.quietHoursTimezone ?? "Europe/Berlin";
    prefsHook.saveNow({
      [field]: value,
      quietHoursTimezone: timezone,
    });
  };

  return (
    <div
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <AccountHeader title={t("account_notifications.quiet_hours_title")} />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <p className="text-right text-sm leading-relaxed text-zinc-400">
          {t("account_notifications.quiet_hours_intro")}
        </p>

        <div className={SETTINGS_CARD}>
          {prefsHook.isLoading || !prefs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : (
            <>
              <div className={cn(SETTINGS_HUB_TOGGLE_ROW, "mb-4 border-b border-primary/10 pb-3")}>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 text-right">
                  <Moon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={SETTINGS_HUB_LIST_ROW_LABEL}>
                      {t("account_notifications.quiet_hours_enable")}
                    </p>
                    <p className={cn(SETTINGS_HUB_LIST_ROW_HINT, "text-zinc-500")}>
                      {t("account_notifications.quiet_hours_enable_hint")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs.quietHoursEnabled}
                  disabled={prefsHook.isSaving}
                  onCheckedChange={(v) => prefsHook.update({ quietHoursEnabled: v })}
                  aria-label={t("account_notifications.quiet_hours_enable")}
                />
              </div>

              <div
                className={cn(
                  "flex flex-col gap-4 transition-opacity",
                  !prefs.quietHoursEnabled && "pointer-events-none opacity-45",
                )}
              >
                <div className="text-right">
                  <label htmlFor="quiet-start" className={SETTINGS_LABEL}>
                    {t("account_notifications.quiet_hours_start")}
                  </label>
                  <input
                    id="quiet-start"
                    type="time"
                    className={cn(SETTINGS_FIELD, "mt-2 text-right")}
                    value={prefs.quietHoursStart}
                    disabled={!prefs.quietHoursEnabled || prefsHook.isSaving}
                    onChange={(e) => onTimeChange("quietHoursStart", e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {formatTimeDisplay(prefs.quietHoursStart, locale)}
                  </p>
                </div>

                <div className="text-right">
                  <label htmlFor="quiet-end" className={SETTINGS_LABEL}>
                    {t("account_notifications.quiet_hours_end")}
                  </label>
                  <input
                    id="quiet-end"
                    type="time"
                    className={cn(SETTINGS_FIELD, "mt-2 text-right")}
                    value={prefs.quietHoursEnd}
                    disabled={!prefs.quietHoursEnabled || prefsHook.isSaving}
                    onChange={(e) => onTimeChange("quietHoursEnd", e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {formatTimeDisplay(prefs.quietHoursEnd, locale)}
                  </p>
                </div>

                <p className="text-right text-xs leading-relaxed text-zinc-600">
                  {t("account_notifications.quiet_hours_example", {
                    start: formatTimeDisplay(prefs.quietHoursStart, locale),
                    end: formatTimeDisplay(prefs.quietHoursEnd, locale),
                  })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

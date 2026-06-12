import { Redirect } from "wouter";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import { usePrivacyPreferences } from "@/hooks/use-privacy-preferences";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HUB_LIST_ROW_HINT,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_HUB_TOGGLE_ROW,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

function ToggleRow({
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
    <div className={SETTINGS_HUB_TOGGLE_ROW}>
      <div className="flex min-w-0 flex-1 items-start gap-2.5 text-start">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={SETTINGS_HUB_LIST_ROW_LABEL}>{label}</p>
          <p className={cn(SETTINGS_HUB_LIST_ROW_HINT, "text-zinc-500")}>{hint}</p>
        </div>
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

export default function AccountPrivacyActivity() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";
  const { prefs, isLoading, isSaving, update } = usePrivacyPreferences(Boolean(user));

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/privacy/activity" />;
  }

  const showActivity = prefs?.showActivityStatus ?? true;
  const showLastSeen = prefs?.showLastSeen ?? true;
  const busy = isLoading || isSaving;

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("settings.privacy.activity.title")} backFallback="/account/privacy" />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <section className={SETTINGS_CARD} dir={textDir}>
          <div className={`${SETTINGS_CARD_SHELL} border-b border-zinc-800/80 px-3 py-3 md:px-4`}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-lime-400" aria-hidden />
              <h2 className="text-[15px] font-semibold text-foreground">
                {t("settings.privacy.activity.section_title")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/90">
              {t("settings.privacy.activity.section_hint")}
            </p>
          </div>

          {isLoading && !prefs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80 px-1 py-1">
              <ToggleRow
                icon={showActivity ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                label={t("settings.privacy.activity.show_status")}
                hint={t("settings.privacy.activity.show_status_hint")}
                checked={showActivity}
                disabled={busy}
                onCheckedChange={(v) => update({ showActivityStatus: v })}
              />
              <ToggleRow
                icon={showLastSeen ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                label={t("settings.privacy.activity.show_last_seen")}
                hint={t("settings.privacy.activity.show_last_seen_hint")}
                checked={showLastSeen}
                disabled={busy}
                onCheckedChange={(v) => update({ showLastSeen: v })}
              />
            </div>
          )}

          <div className="border-t border-zinc-800/80 px-3 py-3 md:px-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground/90">
              {t("settings.privacy.activity.footer_note")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

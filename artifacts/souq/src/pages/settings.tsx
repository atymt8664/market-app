import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  CreditCard,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Shield,
  Star,
  User as UserIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useAuthLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserSessionQueries } from "@/lib/clear-session-query-cache";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { APP_VERSION } from "@/lib/app-config";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD_SHELL,
  SETTINGS_HEADER_BAR,
  SETTINGS_HUB_HEADER_INNER,
  SETTINGS_HUB_LIST_ROW_HINT,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import {
  SETTINGS_ROW_DIVIDER,
  SettingsHubRow,
  SettingsHubSection,
} from "@/components/settings-hub-list";
import {
  appendReturnToQuery,
  stashLegalExplicitReturn,
  stashLegalNavigationReturn,
  stashReturnTarget,
} from "@/lib/return-navigation";

export default function Settings() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useAuthLogout();

  useEffect(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: async () => {
        sessionStorage.clear();
        await clearUserSessionQueries(queryClient);
        navigate("/login");
      },
    });
  };

  const leaveSettings = (path: string) => () => {
    const finalUrl = appendReturnToQuery(path, "/settings");
    stashLegalNavigationReturn("/settings");
    stashLegalExplicitReturn("/settings");
    stashReturnTarget("/settings");
    navigate(finalUrl);
  };

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HUB_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("settings.title")}</h1>
          <Link href="/profile" className="shrink-0">
            <button type="button" className={SETTINGS_BACK_BUTTON} aria-label={t("settings.title")}>
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </Link>
        </div>
      </header>

      <div className={SETTINGS_HUB_MAIN}>
        <SettingsHubSection title={t("settings.section.account")}>
          <SettingsHubRow
            icon={<UserIcon className="w-4 h-4" />}
            label={t("settings.account.profile")}
            hint={t("settings.account.profile_hint")}
            onClick={leaveSettings("/account/profile")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Mail className="w-4 h-4" />}
            label={t("settings.account.email")}
            hint={user?.emailVerified ? t("settings.common.verified") : t("settings.common.unverified")}
            onClick={leaveSettings("/account/email")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Shield className="w-4 h-4" />}
            label={t("settings.account.verification")}
            hint={t("settings.account.verification_preview_hint")}
            onClick={leaveSettings("/account/verification")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<CreditCard className="w-4 h-4" />}
            label={t("settings.account.payments")}
            hint={t("settings.common.coming_soon")}
            onClick={leaveSettings("/account/payments")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>

        <SettingsHubSection title={t("settings.section.privacy_security")}>
          <SettingsHubRow
            icon={<Shield className="w-4 h-4" />}
            label={t("account_info.privacy.title")}
            hint={t("settings.hub.privacy_controls_hint")}
            onClick={leaveSettings("/account/privacy")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Lock className="w-4 h-4" />}
            label={t("account_info.security.title")}
            hint={t("settings.hub.security_center_hint")}
            onClick={leaveSettings("/account/security")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>

        <SettingsHubSection title={t("settings.section.customization")}>
          <SettingsHubRow
            icon={<Bell className="w-4 h-4" />}
            label={t("settings.customization.notifications")}
            hint={t("settings.notifications.placeholder")}
            onClick={leaveSettings("/account/notifications")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Globe className="w-4 h-4" />}
            label={t("settings.customization.language")}
            hint={locale === "ar" ? t("language.option.ar") : locale === "en" ? t("language.option.en") : t("language.option.de")}
            onClick={leaveSettings("/account/language")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Moon className="w-4 h-4" />}
            label={t("account_notifications.quiet_hours_link")}
            hint={t("account_notifications.quiet_hours_link_hint")}
            onClick={leaveSettings("/account/notifications/quiet-hours")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>

        <SettingsHubSection title={t("settings.section.about")}>
          <SettingsHubRow
            icon={<Star className="w-4 h-4" />}
            label={t("settings.about.rate")}
            onClick={leaveSettings("/account/rate")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<HelpCircle className="w-4 h-4" />}
            label={t("settings.about.help")}
            onClick={leaveSettings("/account/help")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Shield className="w-4 h-4" />}
            label={t("settings.about.terms")}
            onClick={leaveSettings("/terms")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Lock className="w-4 h-4" />}
            label={t("settings.about.privacy_policy")}
            onClick={leaveSettings("/privacy")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Info className="w-4 h-4" />}
            label={t("settings.about.about_app")}
            hint={`${t("account_info.about.version_label")} ${APP_VERSION}`}
            onClick={leaveSettings("/account/about")}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>

        {user && (
          <section aria-label={t("settings.logout")}>
            <div className={`${SETTINGS_CARD_SHELL} overflow-hidden p-2.5`}>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="h-11 w-full rounded-xl border border-destructive/35 bg-destructive/10 px-5 text-sm font-semibold gap-2 text-destructive-foreground shadow-[0_0_0_1px_rgba(239,68,68,0.08),0_8px_18px_-14px_rgba(239,68,68,0.45)] hover:bg-destructive/15 hover:text-destructive-foreground"
              >
                <LogOut className="w-5 h-5" /> {t("settings.logout")}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

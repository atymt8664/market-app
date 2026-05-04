import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  CreditCard,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Shield,
  Star,
  User as UserIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  useAuthLogout,
  getAuthMeQueryKey,
  getListMyAdsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AvatarCircle } from "@/components/avatar-circle";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getAccountVerificationStatus, isAccountVerified } from "@/lib/account-verification";
import { APP_VERSION } from "@/lib/app-config";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_ICON_TILE,
  SETTINGS_ICON_TILE_DESTRUCTIVE,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_SECTION_TITLE,
} from "@/components/settings-shell";
import {
  appendReturnToQuery,
  stashLegalExplicitReturn,
  stashLegalNavigationReturn,
  stashReturnTarget,
} from "@/lib/return-navigation";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
  dividerClassName?: string;
}

function Row({
  icon,
  label,
  hint,
  onClick,
  trailing,
  destructive,
  className,
  iconClassName,
  labelClassName,
  hintClassName,
  dividerClassName,
}: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-right border-b border-primary/10 last:border-0 hover:bg-primary/[0.04] active:bg-primary/[0.07] ${dividerClassName ?? ""} ${className ?? ""}`}
    >
      <div
        className={`${destructive ? SETTINGS_ICON_TILE_DESTRUCTIVE : SETTINGS_ICON_TILE} ${iconClassName ?? ""}`}
      >
        {icon}
      </div>
      <div className="flex-1 flex flex-col items-start min-w-0">
        <span
          className={`text-sm font-medium ${destructive ? "text-destructive" : ""} ${labelClassName ?? ""}`}
        >
          {label}
        </span>
        {hint && (
          <span className={`text-xs text-muted-foreground truncate ${hintClassName ?? ""}`}>
            {hint}
          </span>
        )}
      </div>
      {trailing ?? (
        <ChevronLeft className="w-4 h-4 text-primary/45 shrink-0" />
      )}
    </button>
  );
}

function Section({
  title,
  children,
  className,
  titleClassName,
  cardClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  cardClassName?: string;
}) {
  return (
    <section className={`mb-5 ${className ?? ""}`}>
      {title && (
        <h2 className={`${SETTINGS_SECTION_TITLE} ${titleClassName ?? ""}`}>
          {title}
        </h2>
      )}
      <div className={`${SETTINGS_CARD_SHELL} overflow-hidden ${cardClassName ?? ""}`}>
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoutMutation = useAuthLogout();

  // Force dark mode globally. App supports dark design only for now.
  useEffect(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: async () => {
        // Keep UX prefs, but clear session-like local data.
        sessionStorage.clear();

        queryClient.setQueryData(getAuthMeQueryKey(), null);
        queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
        queryClient.removeQueries({ queryKey: getListMyAdsQueryKey() });
        await queryClient.invalidateQueries();

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
  void toast;
  const verificationStatus = getAccountVerificationStatus(user);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col w-full ${SETTINGS_PAGE_BG} pb-10`}
    >
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("settings.title")}</h1>
          <Link href="/profile" className="shrink-0">
            <button type="button" className={SETTINGS_BACK_BUTTON} aria-label={t("settings.title")}>
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </Link>
        </div>
      </header>

      <div className={SETTINGS_MAIN_COLUMN}>
        {user && (
          <Section>
            <button
              type="button"
              onClick={leaveSettings("/account/profile")}
              className="w-full p-4 md:p-5 text-right transition-all hover:bg-primary/[0.06] active:scale-[0.995]"
              dir={locale === "ar" ? "rtl" : "ltr"}
            >
                <div className="flex items-center gap-3 md:gap-4">
                  <AvatarCircle
                    name={user.name || user.email}
                    src={user.avatarUrl}
                    size={62}
                    className="shrink-0 border border-primary/25"
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-base md:text-lg font-bold text-foreground truncate inline-flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {isAccountVerified(user) ? (
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {t("verification.badge")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs md:text-sm text-muted-foreground truncate" dir="ltr">
                      {user.email}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-primary/45 shrink-0" />
                </div>
            </button>
          </Section>
        )}

        <Section title={t("settings.section.account")}>
        <Row
          icon={<UserIcon className="w-4 h-4" />}
          label={t("settings.account.profile")}
          hint={t("settings.account.profile_hint")}
          onClick={leaveSettings("/account/profile")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Mail className="w-4 h-4" />}
          label={t("settings.account.email")}
          hint={user?.emailVerified ? t("settings.common.verified") : t("settings.common.unverified")}
          onClick={leaveSettings("/account/email")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.account.verification")}
          hint={t(`verification.status.${verificationStatus}`)}
          onClick={leaveSettings("/account/verification")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.account.password")}
          onClick={leaveSettings("/account/password")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<CreditCard className="w-4 h-4" />}
          label={t("settings.account.payments")}
          hint={t("settings.common.coming_soon")}
          onClick={leaveSettings("/account/payments")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        </Section>

        <Section title={t("settings.section.customization")}>
        <Row
          icon={<Bell className="w-4 h-4" />}
          label={t("settings.customization.notifications")}
          hint={t("settings.notifications.placeholder")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
          trailing={
            <Switch
              checked={false}
              disabled
              aria-label={t("settings.notifications.aria")}
            />
          }
        />
        <Row
          icon={<Globe className="w-4 h-4" />}
          label={t("settings.customization.language")}
          hint={locale === "ar" ? t("language.option.ar") : locale === "en" ? t("language.option.en") : t("language.option.de")}
          onClick={leaveSettings("/account/language")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        </Section>

        <Section title={t("settings.section.privacy_security")}>
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.privacy.privacy")}
          onClick={leaveSettings("/account/privacy")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.privacy.security")}
          onClick={leaveSettings("/account/security")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        </Section>

        <Section title={t("settings.section.about")}>
        <Row
          icon={<Star className="w-4 h-4" />}
          label={t("settings.about.rate")}
          onClick={leaveSettings("/account/rate")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<HelpCircle className="w-4 h-4" />}
          label={t("settings.about.help")}
          onClick={leaveSettings("/account/help")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.about.terms")}
          onClick={leaveSettings("/terms")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.about.privacy_policy")}
          onClick={leaveSettings("/privacy")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-primary/10"
        />
        <Row
          icon={<Info className="w-4 h-4" />}
          label={t("settings.about.about_app")}
          hint={`${t("account_info.about.version_label")} ${APP_VERSION}`}
          onClick={leaveSettings("/account/about")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
        />
        </Section>

        {user && (
          <div className="pt-4 flex justify-center">
            <div className={`${SETTINGS_CARD} w-full max-w-[min(100%,320px)]`}>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="h-11 w-full rounded-xl border border-destructive/35 bg-destructive/10 px-5 text-sm font-semibold gap-2 text-destructive-foreground shadow-[0_0_0_1px_rgba(239,68,68,0.08),0_8px_18px_-14px_rgba(239,68,68,0.45)] hover:bg-destructive/15 hover:text-destructive-foreground"
              >
                <LogOut className="w-5 h-5" /> {t("settings.logout")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/30 last:border-0 ${dividerClassName ?? ""} ${className ?? ""}`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-foreground"
        } ${iconClassName ?? ""}`}
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
        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
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
    <section className={`mb-4 ${className ?? ""}`}>
      {title && (
        <h2 className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 ${titleClassName ?? ""}`}>
          {title}
        </h2>
      )}
      <div className={`bg-card rounded-xl border border-border overflow-hidden ${cardClassName ?? ""}`}>
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

  const go = (path: string) => () => navigate(path);
  void toast;
  const verificationStatus = getAccountVerificationStatus(user);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-8"
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-4 flex items-center gap-3">
          <Link href="/profile">
            <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-bold text-lg">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        {user && (
          <Section>
            <div className="p-3 md:p-4">
              <button
                type="button"
                onClick={go("/account/profile")}
                className="w-full rounded-2xl border border-primary/20 bg-card/70 p-4 md:p-5 text-right shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)] transition-all hover:bg-card/80 active:scale-[0.995]"
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
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            </div>
          </Section>
        )}

        <Section
          title={t("settings.section.account")}
          className="mb-5"
          titleClassName="mb-2.5 px-2 text-[11px] tracking-[0.08em]"
          cardClassName="rounded-2xl border-primary/20 bg-card/70 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
        >
        <Row
          icon={<UserIcon className="w-4 h-4" />}
          label={t("settings.account.profile")}
          hint={t("settings.account.profile_hint")}
          onClick={go("/account/profile")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Mail className="w-4 h-4" />}
          label={t("settings.account.email")}
          hint={user?.emailVerified ? t("settings.common.verified") : t("settings.common.unverified")}
          onClick={go("/account/email")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.account.verification")}
          hint={t(`verification.status.${verificationStatus}`)}
          onClick={go("/account/verification")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.account.password")}
          onClick={go("/account/password")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<CreditCard className="w-4 h-4" />}
          label={t("settings.account.payments")}
          hint={t("settings.common.coming_soon")}
          onClick={go("/account/payments")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        </Section>

        <Section
          title={t("settings.section.customization")}
          className="mb-5"
          titleClassName="mb-2.5 px-2 text-[11px] tracking-[0.08em]"
          cardClassName="rounded-2xl border-primary/20 bg-card/70 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
        >
        <Row
          icon={<Bell className="w-4 h-4" />}
          label={t("settings.customization.notifications")}
          hint={t("settings.notifications.placeholder")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
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
          onClick={go("/account/language")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        </Section>

        <Section
          title={t("settings.section.privacy_security")}
          className="mb-5"
          titleClassName="mb-2.5 px-2 text-[11px] tracking-[0.08em]"
          cardClassName="rounded-2xl border-primary/20 bg-card/70 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
        >
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.privacy.privacy")}
          onClick={go("/account/privacy")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.privacy.security")}
          onClick={go("/account/security")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        </Section>

        <Section
          title={t("settings.section.about")}
          className="mb-5"
          titleClassName="mb-2.5 px-2 text-[11px] tracking-[0.08em]"
          cardClassName="rounded-2xl border-primary/20 bg-card/70 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
        >
        <Row
          icon={<Star className="w-4 h-4" />}
          label={t("settings.about.rate")}
          onClick={go("/account/rate")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<HelpCircle className="w-4 h-4" />}
          label={t("settings.about.help")}
          onClick={go("/account/help")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Shield className="w-4 h-4" />}
          label={t("settings.about.terms")}
          onClick={go("/terms")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label={t("settings.about.privacy_policy")}
          onClick={go("/privacy")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          dividerClassName="border-border/20"
        />
        <Row
          icon={<Info className="w-4 h-4" />}
          label={t("settings.about.about_app")}
          hint={`${t("account_info.about.version_label")} ${APP_VERSION}`}
          onClick={go("/account/about")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          iconClassName="h-10 w-10 rounded-xl bg-background/70 text-primary border border-primary/20"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-border/20"
        />
        </Section>

        {user && (
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="h-11 w-full max-w-[280px] rounded-xl border border-destructive/35 bg-destructive/10 px-5 text-sm font-semibold gap-2 text-destructive-foreground shadow-[0_0_0_1px_rgba(239,68,68,0.08),0_8px_18px_-14px_rgba(239,68,68,0.45)] hover:bg-destructive/15 hover:text-destructive-foreground"
            >
              <LogOut className="w-5 h-5" /> {t("settings.logout")}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

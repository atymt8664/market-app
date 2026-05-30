import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Shield,
  Star,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  useAuthLogout,
  getAuthProfileCsrfTokenForRequest,
  clearAuthProfileCsrfToken,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserSessionQueries } from "@/lib/clear-session-query-cache";
import { useAuth } from "@/hooks/use-auth";
import { AvatarCircle } from "@/components/avatar-circle";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { isAccountVerified } from "@/lib/account-verification";
import { APP_VERSION } from "@/lib/app-config";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_ICON_TILE,
  SETTINGS_ICON_TILE_DESTRUCTIVE,
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_INPUT,
  SETTINGS_INPUT_ICON_BUTTON,
  SETTINGS_INPUT_ICON_CLASS,
  SETTINGS_LABEL,
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

function parseDeleteAccountErrorMessage(
  status: number,
  serverError: string | undefined,
  translate: (key: string) => string,
): string {
  if (status >= 500) {
    return translate("settings.account.delete.error_server");
  }
  if (typeof serverError === "string" && serverError.trim().length > 0) {
    return serverError.trim();
  }
  if (status === 401) return translate("settings.account.delete.error_unauthorized");
  if (status === 403) return translate("settings.account.delete.error_forbidden");
  if (status === 429) return translate("settings.account.delete.error_rate_limit");
  if (status === 400) return translate("settings.account.delete.error_wrong_password");
  return translate("settings.account.delete.error_generic");
}

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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

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

  const resetDeleteDialog = () => {
    setDeletePassword("");
    setShowDeletePassword(false);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deletePending) return;
    setDeleteOpen(open);
    if (!open) resetDeleteDialog();
  };

  const clearSessionAfterAccountDeletion = async () => {
    sessionStorage.clear();
    await clearUserSessionQueries(queryClient);
  };

  const handleConfirmDeleteAccount = async () => {
    const pwd = deletePassword.trim();
    if (!pwd || deletePending) return;
    setDeletePending(true);
    try {
      const csrf = getAuthProfileCsrfTokenForRequest();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (csrf) headers["X-CSRF-Token"] = csrf;

      const res = await fetch(apiUrl("/api/account/delete"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ password: pwd }),
      });

      const rawText = await res.text();
      let serverError: string | undefined;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText) as { error?: unknown };
          if (typeof parsed.error === "string") serverError = parsed.error;
        } catch {
          /* ignore malformed JSON */
        }
      }

      if (!res.ok) {
        toast({
          title: parseDeleteAccountErrorMessage(res.status, serverError, t),
          variant: "destructive",
        });
        return;
      }

      resetDeleteDialog();
      setDeleteOpen(false);
      clearAuthProfileCsrfToken();
      await clearSessionAfterAccountDeletion();
      toast({ title: t("settings.account.delete.success") });
      navigate("/login");
    } catch {
      toast({
        title: t("settings.account.delete.error_generic"),
        variant: "destructive",
      });
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}
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
          hint={t("settings.account.verification_preview_hint")}
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
          onClick={leaveSettings("/account/notifications")}
          className="min-h-[70px] px-4 md:px-5 hover:bg-primary/[0.04] active:bg-primary/[0.06]"
          labelClassName="text-sm md:text-[15px] text-foreground"
          hintClassName="mt-0.5 text-[11px] md:text-xs text-muted-foreground/90"
          dividerClassName="border-primary/10"
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
          <>
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

            <section
              className="mt-3 flex justify-center pb-6 md:pb-8"
              aria-label={t("settings.account.delete_placeholder_title")}
            >
              <div className={`${SETTINGS_CARD} w-full max-w-[min(100%,320px)]`}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleDeleteDialogOpenChange(true)}
                  disabled={deletePending}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  className="h-11 w-full rounded-xl border border-red-500/45 bg-red-950/35 px-5 text-sm font-semibold gap-2 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.2),0_8px_24px_-14px_rgba(239,68,68,0.52)] hover:border-red-400/55 hover:bg-red-950/50 hover:text-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-5 w-5 shrink-0 text-red-300" aria-hidden />
                  {t("settings.account.delete_placeholder_title")}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      {user && (
        <AlertDialog open={deleteOpen} onOpenChange={handleDeleteDialogOpenChange}>
          <AlertDialogContent
            dir={locale === "ar" ? "rtl" : "ltr"}
            className={cn(
              SETTINGS_DIALOG_CONTENT,
              "fixed left-[50%] top-[50%] z-50 flex max-h-[min(90vh,680px)] w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
            )}
          >
            <div className="max-h-[min(90vh,680px)] overflow-y-auto px-5 pb-5 pt-5 md:px-6">
              <AlertDialogTitle className="text-right text-base font-bold text-foreground md:text-lg">
                {t("settings.account.delete.dialog_title")}
              </AlertDialogTitle>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("settings.account.delete.warning_intro")}</p>

              <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-muted-foreground marker:text-red-400/80">
                <li>{t("settings.account.delete.bullet_permanent")}</li>
                <li>{t("settings.account.delete.bullet_ads")}</li>
                <li>{t("settings.account.delete.bullet_messages")}</li>
                <li>{t("settings.account.delete.bullet_notifications_favorites")}</li>
                <li>{t("settings.account.delete.bullet_admin_logs")}</li>
                <li className="font-medium text-red-200/90">{t("settings.account.delete.bullet_irreversible")}</li>
              </ul>

              <div className="mt-5 space-y-2">
                <label htmlFor="delete-account-password" className={SETTINGS_LABEL}>
                  {t("settings.account.delete.password_label")}
                </label>
                <div className="relative">
                  <input
                    id="delete-account-password"
                    type={showDeletePassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t("settings.account.delete.password_placeholder")}
                    disabled={deletePending}
                    className={cn(SETTINGS_INPUT, locale === "ar" ? "pl-11" : "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword((v) => !v)}
                    disabled={deletePending}
                    className={cn(
                      SETTINGS_INPUT_ICON_BUTTON,
                      locale === "ar" ? "left-3 right-auto" : "right-3 left-auto",
                    )}
                    aria-label={
                      showDeletePassword
                        ? t("settings.account.delete.hide_password")
                        : t("settings.account.delete.show_password")
                    }
                  >
                    {showDeletePassword ? (
                      <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                    ) : (
                      <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3",
                  locale !== "ar" && "sm:flex-row-reverse",
                )}
              >
                <AlertDialogCancel asChild disabled={deletePending}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deletePending}
                    className="h-11 min-w-[7rem] rounded-xl border-primary/35 bg-[#0A0A0A]/80"
                  >
                    {t("settings.account.delete.cancel")}
                  </Button>
                </AlertDialogCancel>
                <Button
                  type="button"
                  disabled={deletePending || deletePassword.trim().length === 0}
                  onClick={() => void handleConfirmDeleteAccount()}
                  aria-busy={deletePending}
                  className="inline-flex h-11 min-w-[10rem] items-center justify-center gap-2 rounded-xl border border-red-500/45 bg-red-950/55 font-semibold text-red-100 shadow-[0_0_18px_-12px_rgba(248,113,113,0.55)] hover:bg-red-950/75 hover:text-red-50 disabled:opacity-50"
                >
                  {deletePending ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      {t("settings.account.delete.working")}
                    </>
                  ) : (
                    t("settings.account.delete.confirm")
                  )}
                </Button>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}

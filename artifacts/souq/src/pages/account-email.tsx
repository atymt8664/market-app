import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { CheckCircle2, Lock, Mail, ShieldAlert } from "lucide-react";
import { useAuthResendVerification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_CARD_COMPACT,
  SETTINGS_ICON_TILE,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";

export default function AccountEmail() {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const resend = useAuthResendVerification();

  if (!isLoading && !user) return <Redirect to="/guest-welcome?redirect=/account/email" />;
  if (!user) return null;

  const verified = user.emailVerified;

  const handleResend = () => {
    resend.mutate(
      { data: { email: user.email } },
      {
        onSuccess: () => {
          toast({ title: t("account_email.sent"), description: t("account_email.check_email") });
          navigate(`/verify-email?email=${encodeURIComponent(user.email)}`);
        },
      },
    );
  };

  return (
    <div
      className={cn("flex min-h-[100dvh] w-full flex-col", SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)}
      dir={dir}
    >
      <AccountHeader title={t("account_email.title")} />
      <div className={cn(SETTINGS_MAIN_COLUMN, "gap-3 py-4 md:py-5")}>
        <div className={cn(SETTINGS_CARD, "flex flex-col gap-3 md:gap-4")}>
          <div
            className={cn(
              SETTINGS_CARD_COMPACT,
              "flex items-start gap-3 border-primary/30 bg-zinc-950/70 p-4 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10",
            )}
          >
            <div className={SETTINGS_ICON_TILE}>
              <Mail className="h-5 w-5" />
            </div>
            <div className={cn("min-w-0 flex-1", textStart)}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary/90">
                {t("account_email.current_email")}
              </div>
              <div className="truncate text-sm font-semibold text-foreground md:text-base" dir="ltr">
                {user.email}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 md:text-sm">
                {t("account_email.helper")}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 md:text-sm">
                {t("account_email.helper_security_note")}
              </p>
            </div>
          </div>

          <div
            className={cn(
              SETTINGS_CARD_COMPACT,
              "flex items-start gap-3 border p-4 shadow-[0_0_16px_-14px_hsl(var(--primary)/0.12)]",
              verified
                ? "border-primary/35 bg-primary/[0.07]"
                : "border-amber-500/35 bg-amber-500/[0.06]",
            )}
          >
            <div
              className={cn(
                SETTINGS_ICON_TILE,
                !verified && "border-amber-500/40 bg-amber-500/10 text-amber-400",
              )}
            >
              {verified ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div className={cn("min-w-0 flex-1", textStart)}>
              <div className="mb-1 text-sm font-semibold text-foreground md:text-base">
                {verified ? t("account_email.verified") : t("account_email.unverified")}
              </div>
              <div className="text-xs leading-relaxed text-zinc-500 md:text-sm">
                {verified ? t("account_email.verified_desc") : t("account_email.unverified_desc")}
              </div>
              {!verified && (
                <div className={`${SETTINGS_ACTION_PANEL} mt-3`}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resend.isPending}
                    className={SETTINGS_PRIMARY_BUTTON}
                  >
                    {resend.isPending ? t("account_email.resending") : t("account_email.resend_code")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              SETTINGS_CARD_COMPACT,
              "border-amber-500/35 bg-amber-500/[0.07] p-4 shadow-[0_0_18px_-12px_rgba(245,158,11,0.12)]",
              textStart,
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/95">
              {t("account_email.change_notice_kicker")}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">
              {t("account_email.change_notice_title")}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 md:text-sm">
              {t("account_email.change_notice_body")}
            </p>
          </div>

          <div className={cn(SETTINGS_ACTION_PANEL, "gap-2 pt-0.5")}>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className={cn(
                "flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-primary/28 bg-zinc-950/85 px-4 py-2.5 text-sm font-semibold text-zinc-500 shadow-none ring-1 ring-primary/8",
              )}
            >
              <Lock className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
              <span>{t("account_email.change_email")}</span>
              <span className="inline-flex rounded-full border border-zinc-600/55 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                {t("account_email.soon")}
              </span>
            </button>
            <p className={cn("text-center text-[11px] leading-relaxed text-zinc-500", textStart)}>
              {t("account_email.change_disabled_footnote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

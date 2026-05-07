import { Redirect, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { useAuthResendVerification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_CARD_COMPACT,
  SETTINGS_DIALOG_ACTION_PANEL,
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_ICON_TILE,
  SETTINGS_INPUT,
  SETTINGS_LABEL,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";

const CHANGE_EMAIL_DISABLED_MSG =
  "ميزة تغيير البريد الإلكتروني غير متاحة حالياً";

export default function AccountEmail() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const resend = useAuthResendVerification();
  const [changeOpen, setChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetChangeForm = () => {
    setNewEmail("");
    setCurrentPassword("");
    setOtpCode("");
    setStep("request");
    setIsSubmitting(false);
  };

  /** Change-email flow disabled until backend is ready — modal handlers kept for future use. */
  const handleRequestOtp = () => {
    toast({ title: CHANGE_EMAIL_DISABLED_MSG });
  };

  const handleVerifyAndChange = () => {
    toast({ title: CHANGE_EMAIL_DISABLED_MSG });
  };

  return (
    <div className={`flex min-h-[100dvh] w-full flex-col ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("account_email.title")} />
      <div className={`${SETTINGS_MAIN_COLUMN} py-5`} dir="rtl">
        <div className={`${SETTINGS_CARD} flex flex-col gap-4`}>
          <div
            className={cn(
              SETTINGS_CARD_COMPACT,
              "flex items-start gap-3 border-primary/30 bg-zinc-950/70 p-4",
            )}
          >
            <div className={SETTINGS_ICON_TILE}>
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn(SETTINGS_LABEL, "mb-1")}>{t("account_email.current_email")}</div>
              <div className="truncate font-medium text-foreground" dir="ltr">
                {user.email}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t("account_email.helper")}</p>
            </div>
          </div>

          <div
            className={cn(
              SETTINGS_CARD_COMPACT,
              "flex items-start gap-3 border p-4",
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
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-semibold text-foreground">
                {verified ? t("account_email.verified") : t("account_email.unverified")}
              </div>
              <div className="text-sm text-zinc-500">
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

          <div className={`${SETTINGS_ACTION_PANEL} flex flex-col gap-3 pt-1`}>
            <p className="text-center text-xs leading-relaxed text-zinc-500">{CHANGE_EMAIL_DISABLED_MSG}</p>
            <button
              type="button"
              onClick={() => toast({ title: CHANGE_EMAIL_DISABLED_MSG })}
              className={cn(SETTINGS_OUTLINE_BUTTON, "opacity-80")}
            >
              {t("account_email.change_email")}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={changeOpen}
        onOpenChange={(open) => {
          setChangeOpen(open);
          if (!open) resetChangeForm();
        }}
      >
        <DialogContent
          dir="rtl"
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "flex max-h-[min(90dvh,100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0 text-right sm:max-w-md",
            "[&>button.absolute]:right-4 [&>button.absolute]:top-4 [&>button.absolute]:h-9 [&>button.absolute]:w-9 [&>button.absolute]:rounded-lg [&>button.absolute]:border [&>button.absolute]:border-primary/35 [&>button.absolute]:text-primary [&>button.absolute]:opacity-100 hover:[&>button.absolute]:bg-primary/10",
          )}
        >
          <div className="shrink-0 space-y-2 border-b border-primary/15 px-5 pb-4 pt-5">
            <DialogHeader className="space-y-2 p-0 text-right">
              <DialogTitle className="text-right text-lg font-bold leading-snug text-foreground">
                {t("account_email.change_email")}
              </DialogTitle>
              <DialogDescription className="text-right text-sm leading-relaxed text-zinc-500">
                {t("account_email.modal_desc")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-email" className={SETTINGS_LABEL}>
                  {t("account_email.new_email")}
                </label>
                <input
                  id="new-email"
                  dir="ltr"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={cn(SETTINGS_INPUT, "text-left")}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="current-password" className={SETTINGS_LABEL}>
                  {t("account_email.current_password")}
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="********"
                  className={SETTINGS_INPUT}
                />
              </div>
              {step === "verify" && (
                <div className="space-y-2">
                  <label htmlFor="otp-code" className={SETTINGS_LABEL}>
                    {t("account_email.otp_label")}
                  </label>
                  <input
                    id="otp-code"
                    dir="ltr"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className={cn(SETTINGS_INPUT, "text-left")}
                    inputMode="numeric"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-primary/15 bg-[#0A0A0A]/98 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className={cn(SETTINGS_DIALOG_ACTION_PANEL, "mx-5 mb-1")}>
              {step === "request" ? (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isSubmitting}
                  className={cn(SETTINGS_PRIMARY_BUTTON, "!min-h-11 py-2.5 text-sm")}
                >
                  {isSubmitting ? t("account_email.sending") : t("account_email.send_otp")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyAndChange}
                  disabled={isSubmitting}
                  className={cn(SETTINGS_PRIMARY_BUTTON, "!min-h-11 py-2.5 text-sm")}
                >
                  {isSubmitting ? t("account_email.verifying") : t("account_email.confirm_update")}
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

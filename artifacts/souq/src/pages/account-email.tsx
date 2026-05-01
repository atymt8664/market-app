import { Redirect, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { useAuthResendVerification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const handleRequestOtp = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!emailRegex.test(email)) {
      toast({
        title: t("account_email.invalid_email"),
        description: t("account_email.invalid_email_desc"),
        variant: "destructive",
      });
      return;
    }
    if (email === user.email.toLowerCase()) {
      toast({
        title: t("account_email.same_email"),
        description: t("account_email.same_email_desc"),
        variant: "destructive",
      });
      return;
    }
    if (!currentPassword.trim()) {
      toast({
        title: t("account_email.password_required"),
        description: t("account_email.password_required_desc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // NOTE: Backend endpoints for secure email change OTP flow are not available yet.
      // We keep validation/UI flow ready and block the final action safely.
      await new Promise((resolve) => setTimeout(resolve, 400));
      setStep("verify");
      toast({
        title: t("account_email.next_step"),
        description: t("account_email.next_step_desc"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndChange = async () => {
    if (!otpCode.trim()) {
      toast({
        title: t("account_email.otp_required"),
        description: t("account_email.otp_required_desc"),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast({
        title: t("account_email.unavailable"),
        description: t("account_email.unavailable_desc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title={t("account_email.title")} />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <div className="rounded-2xl border border-primary/20 bg-card/70 p-4 md:p-5 flex flex-col gap-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <div className="bg-card rounded-xl border border-border/70 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-background/70 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">{t("account_email.current_email")}</div>
              <div className="font-medium truncate" dir="ltr">{user.email}</div>
              <p className="mt-2 text-xs text-muted-foreground/95 leading-relaxed">
                {t("account_email.helper")}
              </p>
            </div>
          </div>

          <div className={`rounded-xl border p-4 flex items-start gap-3 ${verified ? "bg-primary/10 border-primary/30" : "bg-amber-500/5 border-amber-500/30"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${verified ? "bg-primary/20 text-primary" : "bg-amber-500/15 text-amber-500"}`}>
              {verified ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold mb-1">
                {verified ? t("account_email.verified") : t("account_email.unverified")}
              </div>
              <div className="text-sm text-muted-foreground">
                {verified
                  ? t("account_email.verified_desc")
                  : t("account_email.unverified_desc")}
              </div>
              {!verified && (
                <Button
                  onClick={handleResend}
                  disabled={resend.isPending}
                  className="mt-3 h-10 rounded-xl w-full sm:w-auto sm:min-w-[220px]"
                >
                  {resend.isPending ? t("account_email.resending") : t("account_email.resend_code")}
                </Button>
              )}
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangeOpen(true)}
              className="h-11 rounded-xl w-full sm:w-auto sm:min-w-[220px] border-primary/30 bg-background/50 hover:bg-primary/10"
            >
              {t("account_email.change_email")}
            </Button>
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
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("account_email.change_email")}</DialogTitle>
            <DialogDescription>
              {t("account_email.modal_desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">{t("account_email.new_email")}</Label>
              <Input
                id="new-email"
                dir="ltr"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("account_email.current_password")}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="********"
                className="h-10 rounded-xl"
              />
            </div>
            {step === "verify" && (
              <div className="space-y-1.5">
                <Label htmlFor="otp-code">{t("account_email.otp_label")}</Label>
                <Input
                  id="otp-code"
                  dir="ltr"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="h-10 rounded-xl"
                  inputMode="numeric"
                />
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-start">
            {step === "request" ? (
              <Button
                type="button"
                onClick={handleRequestOtp}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? t("account_email.sending") : t("account_email.send_otp")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleVerifyAndChange}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? t("account_email.verifying") : t("account_email.confirm_update")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

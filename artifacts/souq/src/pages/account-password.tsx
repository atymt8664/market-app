import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthChangePassword } from "@workspace/api-client-react";
import { Eye, EyeOff } from "lucide-react";
import { t } from "@/i18n";

export default function AccountPassword() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const change = useAuthChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isLoading && !user) return <Redirect to="/guest-welcome?redirect=/account/password" />;

  const hasMinLength = next.length >= 8;
  const hasUppercase = /[A-Z]/.test(next);
  const hasNumber = /\d/.test(next);
  const isStrong = hasMinLength && hasUppercase && hasNumber;
  const confirmMismatch = confirm.length > 0 && next !== confirm;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      toast({
        title: t("account_password.weak_title"),
        description: t("account_password.weak_desc"),
        variant: "destructive",
      });
      return;
    }
    if (next !== confirm) {
      toast({
        title: t("account_password.mismatch_title"),
        description: t("account_password.mismatch_desc"),
        variant: "destructive",
      });
      return;
    }
    change.mutate(
      { data: { currentPassword: current, newPassword: next } },
      {
        onSuccess: () => {
          toast({ title: t("account_password.changed") });
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: t("account_password.change_failed"),
            description: e?.data?.error || t("account_password.current_password_hint"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title={t("account_password.title")} />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-primary/20 bg-card/70 p-4 md:p-5 flex flex-col gap-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]"
          dir="rtl"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="current" className="text-xs md:text-sm text-muted-foreground/95">
              {t("account_password.current")}
            </Label>
            <div className="relative">
              <Input
                id="current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 pl-11 focus-visible:ring-1 focus-visible:ring-primary/45"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showCurrent ? t("account_password.hide_current") : t("account_password.show_current")}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="next" className="text-xs md:text-sm text-muted-foreground/95">
              {t("account_password.new")}
            </Label>
            <div className="relative">
              <Input
                id="next"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 pl-11 focus-visible:ring-1 focus-visible:ring-primary/45"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNext ? t("account_password.hide_new") : t("account_password.show_new")}
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-0.5 space-y-1 text-xs">
              <p className={hasMinLength ? "text-primary" : "text-muted-foreground"}>
                {hasMinLength ? "✓" : "•"} {t("account_password.rule_min")}
              </p>
              <p className={hasUppercase ? "text-primary" : "text-muted-foreground"}>
                {hasUppercase ? "✓" : "•"} {t("account_password.rule_upper")}
              </p>
              <p className={hasNumber ? "text-primary" : "text-muted-foreground"}>
                {hasNumber ? "✓" : "•"} {t("account_password.rule_number")}
              </p>
              {next.length > 0 && !isStrong && (
                <p className="text-amber-400">{t("account_password.weak_inline")}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm" className="text-xs md:text-sm text-muted-foreground/95">
              {t("account_password.confirm")}
            </Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="h-11 rounded-xl border-border/70 bg-background/70 px-3.5 pl-11 focus-visible:ring-1 focus-visible:ring-primary/45"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? t("account_password.hide_confirm") : t("account_password.show_confirm")}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmMismatch && (
              <p className="text-xs text-destructive">{t("account_password.mismatch_inline")}</p>
            )}
          </div>
          <div className="pt-2">
            <Button
              type="submit"
              disabled={change.isPending || !isStrong || confirmMismatch}
              className="h-11 w-full sm:w-auto sm:min-w-[220px] rounded-xl bg-primary text-black text-sm font-semibold shadow-[0_8px_18px_-12px_rgba(182,227,86,0.6)] hover:bg-primary/90"
            >
              {change.isPending ? t("account_password.saving") : t("account_password.update")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

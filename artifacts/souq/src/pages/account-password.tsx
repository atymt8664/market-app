import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { useToast } from "@/hooks/use-toast";
import { useAuthChangePassword } from "@workspace/api-client-react";
import { Eye, EyeOff } from "lucide-react";
import { t } from "@/i18n";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_INPUT,
  SETTINGS_INPUT_ICON_BUTTON,
  SETTINGS_INPUT_ICON_CLASS,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";

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
    <div className={`flex min-h-[100dvh] w-full flex-col ${SETTINGS_PAGE_BG} pb-8`}>
      <AccountHeader title={t("account_password.title")} />
      <div className={`${SETTINGS_MAIN_COLUMN} py-5`}>
        <form onSubmit={onSubmit} className={`${SETTINGS_CARD} flex flex-col gap-5`} dir="rtl">
          <div className="flex flex-col gap-2">
            <label htmlFor="current" className={SETTINGS_LABEL}>
              {t("account_password.current")}
            </label>
            <div className="relative">
              <input
                id="current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className={cn(SETTINGS_INPUT, "pl-11")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className={SETTINGS_INPUT_ICON_BUTTON}
                aria-label={
                  showCurrent ? t("account_password.hide_current") : t("account_password.show_current")
                }
              >
                {showCurrent ? (
                  <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                ) : (
                  <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="next" className={SETTINGS_LABEL}>
              {t("account_password.new")}
            </label>
            <div className="relative">
              <input
                id="next"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                className={cn(SETTINGS_INPUT, "pl-11")}
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className={SETTINGS_INPUT_ICON_BUTTON}
                aria-label={showNext ? t("account_password.hide_new") : t("account_password.show_new")}
              >
                {showNext ? (
                  <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                ) : (
                  <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                )}
              </button>
            </div>
            <div className="mt-0.5 space-y-1 text-xs">
              <p className={hasMinLength ? "text-primary" : "text-zinc-500"}>
                {hasMinLength ? "✓" : "•"} {t("account_password.rule_min")}
              </p>
              <p className={hasUppercase ? "text-primary" : "text-zinc-500"}>
                {hasUppercase ? "✓" : "•"} {t("account_password.rule_upper")}
              </p>
              <p className={hasNumber ? "text-primary" : "text-zinc-500"}>
                {hasNumber ? "✓" : "•"} {t("account_password.rule_number")}
              </p>
              {next.length > 0 && !isStrong && (
                <p className="text-amber-400">{t("account_password.weak_inline")}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className={SETTINGS_LABEL}>
              {t("account_password.confirm")}
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className={cn(SETTINGS_INPUT, "pl-11")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className={SETTINGS_INPUT_ICON_BUTTON}
                aria-label={
                  showConfirm ? t("account_password.hide_confirm") : t("account_password.show_confirm")
                }
              >
                {showConfirm ? (
                  <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                ) : (
                  <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                )}
              </button>
            </div>
            {confirmMismatch && (
              <p className="text-xs text-destructive">{t("account_password.mismatch_inline")}</p>
            )}
          </div>
          <div className={`${SETTINGS_ACTION_PANEL} pt-2`}>
            <button
              type="submit"
              disabled={change.isPending || !isStrong || confirmMismatch}
              className={SETTINGS_PRIMARY_BUTTON}
            >
              {change.isPending ? t("account_password.saving") : t("account_password.update")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

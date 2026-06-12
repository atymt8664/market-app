import { useState } from "react";
import { Redirect } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, QrCode, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  fetchUser2faStatus,
  user2faDisable,
  user2faRegenerateBackupCodes,
  user2faSetupConfirm,
  user2faSetupQr,
  user2faSetupStart,
} from "@/lib/user-2fa-api";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";

export const user2faQueryKey = () => ["account", "2fa", "status"] as const;

const LIME_RING =
  "border-lime-400/30 bg-zinc-950/80 shadow-[0_0_32px_-14px_rgba(163,230,53,0.4)] ring-1 ring-lime-500/20";
const LIME_GLOW_BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-lime-400/35 bg-lime-500/10 px-2.5 py-0.5 text-[11px] font-medium text-lime-200 ring-1 ring-lime-400/15";

export default function AccountSecurityTwoFactor() {
  const { user, isLoading: authLoading } = useAuth();
  const { locale } = useLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: user2faQueryKey(),
    queryFn: fetchUser2faStatus,
    enabled: Boolean(user),
  });

  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [setupPassword, setSetupPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [backupOpen, setBackupOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableErr, setDisableErr] = useState("");

  const [regenPassword, setRegenPassword] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenErr, setRegenErr] = useState("");

  if (!authLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/security/two-factor" />;
  }

  const enabled = statusQuery.data?.enabled === true;

  const resetEnableFlow = () => {
    setStep(0);
    setSetupPassword("");
    setTotpCode("");
    setQrDataUrl(null);
    setErr("");
    setBusy(false);
  };

  const refreshStatus = () => {
    void queryClient.invalidateQueries({ queryKey: user2faQueryKey() });
  };

  const startQrFlow = async () => {
    setErr("");
    if (!setupPassword.trim()) {
      setErr(t("settings.two_factor.err_password_required"));
      return;
    }
    setBusy(true);
    try {
      await user2faSetupStart(setupPassword);
      const { qrDataUrl: url } = await user2faSetupQr();
      setQrDataUrl(url);
      setStep(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("settings.two_factor.generic_err"));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    setErr("");
    const c = totpCode.trim();
    if (!/^\d{6}$/.test(c)) {
      setErr(t("settings.two_factor.err_code_digits"));
      return;
    }
    setBusy(true);
    try {
      const { backupCodes: codes } = await user2faSetupConfirm(setupPassword, c);
      setBackupCodes(codes);
      setEnableOpen(false);
      resetEnableFlow();
      setBackupOpen(true);
      refreshStatus();
      toast({ title: t("settings.two_factor.toast_enabled") });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("settings.two_factor.generic_err"));
    } finally {
      setBusy(false);
    }
  };

  const submitDisable = async () => {
    setDisableErr("");
    if (!disablePassword.trim() || !disableCode.trim()) {
      setDisableErr(t("settings.two_factor.err_fill_all"));
      return;
    }
    setDisableBusy(true);
    try {
      await user2faDisable(disablePassword, disableCode);
      setDisableOpen(false);
      setDisablePassword("");
      setDisableCode("");
      refreshStatus();
      toast({ title: t("settings.two_factor.toast_disabled") });
    } catch (e) {
      setDisableErr(e instanceof Error ? e.message : t("settings.two_factor.generic_err"));
    } finally {
      setDisableBusy(false);
    }
  };

  const submitRegen = async () => {
    setRegenErr("");
    if (!regenPassword.trim() || !regenCode.trim()) {
      setRegenErr(t("settings.two_factor.err_fill_all"));
      return;
    }
    setRegenBusy(true);
    try {
      const { backupCodes: codes } = await user2faRegenerateBackupCodes(regenPassword, regenCode);
      setRegenOpen(false);
      setRegenPassword("");
      setRegenCode("");
      setBackupCodes(codes);
      setBackupOpen(true);
      refreshStatus();
      toast({ title: t("settings.two_factor.toast_backup_regenerated") });
    } catch (e) {
      setRegenErr(e instanceof Error ? e.message : t("settings.two_factor.generic_err"));
    } finally {
      setRegenBusy(false);
    }
  };

  const copyBackups = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast({ title: t("settings.two_factor.copied") });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader
        title={t("settings.security_center.two_factor")}
        backFallback="/account/security"
      />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <section className={cn(SETTINGS_CARD, SETTINGS_CARD_SHELL, LIME_RING)} dir={textDir}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-400/40 bg-lime-500/10 text-lime-300 shadow-[0_0_22px_-10px_rgba(163,230,53,0.55)] ring-1 ring-lime-400/20">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("settings.two_factor.section_title")}
                </h2>
                {statusQuery.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  <span className={LIME_GLOW_BADGE}>
                    {enabled ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                        {t("settings.two_factor.status_on")}
                      </>
                    ) : (
                      <>
                        <ShieldOff className="h-3.5 w-3.5 opacity-80" aria-hidden />
                        {t("settings.two_factor.status_off")}
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {t("settings.two_factor.section_hint")}
              </p>
              {enabled && statusQuery.data ? (
                <p className="mt-2 text-[11px] text-muted-foreground/90">
                  {t("settings.two_factor.backup_remaining", {
                    count: String(statusQuery.data.backupCodesRemaining),
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {!enabled ? (
              <button
                type="button"
                onClick={() => {
                  resetEnableFlow();
                  setEnableOpen(true);
                }}
                className={cn(
                  SETTINGS_PRIMARY_BUTTON,
                  "inline-flex items-center justify-center gap-2 border-lime-400/35 bg-lime-500/15 text-lime-100 shadow-[0_0_28px_-12px_rgba(163,230,53,0.5)] hover:bg-lime-500/22",
                )}
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                {t("settings.two_factor.enable")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRegenPassword("");
                    setRegenCode("");
                    setRegenErr("");
                    setRegenOpen(true);
                  }}
                  className={cn(
                    SETTINGS_OUTLINE_BUTTON,
                    "inline-flex items-center justify-center gap-2 border-lime-400/30 text-lime-100",
                  )}
                >
                  {t("settings.two_factor.regenerate_backup")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisablePassword("");
                    setDisableCode("");
                    setDisableErr("");
                    setDisableOpen(true);
                  }}
                  className={cn(
                    SETTINGS_OUTLINE_BUTTON,
                    "inline-flex items-center justify-center gap-2 border-red-500/35 text-red-100 hover:bg-red-950/40",
                  )}
                >
                  <ShieldOff className="h-4 w-4" aria-hidden />
                  {t("settings.two_factor.disable")}
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <Dialog open={enableOpen} onOpenChange={(o) => { setEnableOpen(o); if (!o) resetEnableFlow(); }}>
        <DialogContent dir={textDir} className={cn(SETTINGS_DIALOG_CONTENT, "max-w-md border-lime-500/25")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <QrCode className="h-5 w-5 text-lime-400" aria-hidden />
              {step === 0
                ? t("settings.two_factor.step_password")
                : step === 1
                  ? t("settings.two_factor.step_scan")
                  : t("settings.two_factor.step_code")}
            </DialogTitle>
            {step === 1 ? (
              <DialogDescription>{t("settings.two_factor.scan_hint")}</DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="grid gap-4 py-1">
            {err ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {err}
              </p>
            ) : null}

            {step === 0 ? (
              <div className="space-y-2">
                <Label htmlFor="user-twofa-setup-pw">{t("settings.two_factor.password_label")}</Label>
                <Input
                  id="user-twofa-setup-pw"
                  type="password"
                  autoComplete="current-password"
                  value={setupPassword}
                  disabled={busy}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            ) : null}

            {step === 1 && qrDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-lime-400/25 bg-white p-3 shadow-[0_0_40px_-16px_rgba(163,230,53,0.65)] ring-2 ring-lime-400/15">
                  <img
                    src={qrDataUrl}
                    alt={t("settings.two_factor.qr_alt")}
                    className="h-44 w-44 max-w-full md:h-52 md:w-52"
                    decoding="async"
                  />
                </div>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(2)}>
                  {t("settings.two_factor.next")}
                </Button>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2">
                <Label htmlFor="user-twofa-first-code">{t("settings.two_factor.code_label")}</Label>
                <Input
                  id="user-twofa-first-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={totpCode}
                  disabled={busy}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 text-center text-lg tracking-[0.35em] dir-ltr"
                  dir="ltr"
                  placeholder="••••••"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex flex-row-reverse flex-wrap gap-2">
            {step === 0 ? (
              <Button
                type="button"
                className="bg-lime-600 text-black hover:bg-lime-500"
                disabled={busy}
                onClick={() => void startQrFlow()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {t("settings.two_factor.open_enable")}
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setStep(0);
                  setQrDataUrl(null);
                }}
              >
                {t("settings.two_factor.back")}
              </Button>
            ) : null}
            {step === 2 ? (
              <>
                <Button
                  type="button"
                  className="bg-lime-600 text-black hover:bg-lime-500"
                  disabled={busy}
                  onClick={() => void confirmEnable()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {t("settings.two_factor.confirm")}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(1)}>
                  {t("settings.two_factor.back")}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={backupOpen} onOpenChange={(o) => !o && (setBackupOpen(false), setBackupCodes([]))}>
        <DialogContent dir={textDir} className={cn(SETTINGS_DIALOG_CONTENT, "max-w-lg border-amber-500/30")}>
          <DialogHeader>
            <DialogTitle className="text-amber-100">{t("settings.two_factor.backup_title")}</DialogTitle>
            <DialogDescription className="text-amber-200/85">
              {t("settings.two_factor.backup_warn")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-auto rounded-xl border border-amber-500/25 bg-zinc-950/90 p-3 ring-1 ring-amber-500/15">
            <ul className="grid grid-cols-1 gap-2 font-mono text-sm text-amber-50 sm:grid-cols-2" dir="ltr">
              {backupCodes.map((c) => (
                <li
                  key={c}
                  className="rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-2 py-1.5 text-center"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="flex flex-row-reverse flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void copyBackups()}>
              <Copy className="ms-1 h-4 w-4" aria-hidden />
              {t("settings.two_factor.copy_all")}
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-black hover:bg-amber-500"
              onClick={() => {
                setBackupOpen(false);
                setBackupCodes([]);
              }}
            >
              {t("settings.two_factor.saved_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent dir={textDir} className={cn(SETTINGS_DIALOG_CONTENT, "max-w-md")}>
          <DialogHeader>
            <DialogTitle>{t("settings.two_factor.disable_title")}</DialogTitle>
            <DialogDescription>{t("settings.two_factor.disable_hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {disableErr ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {disableErr}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="user-twofa-dis-pw">{t("settings.two_factor.password_label")}</Label>
              <Input
                id="user-twofa-dis-pw"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                disabled={disableBusy}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-twofa-dis-code">{t("settings.two_factor.disable_code_label")}</Label>
              <Input
                id="user-twofa-dis-code"
                autoComplete="one-time-code"
                value={disableCode}
                disabled={disableBusy}
                onChange={(e) => setDisableCode(e.target.value)}
                className="h-11"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button type="button" disabled={disableBusy} onClick={() => void submitDisable()}>
              {disableBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("settings.two_factor.disable_submit")}
            </Button>
            <Button type="button" variant="outline" disabled={disableBusy} onClick={() => setDisableOpen(false)}>
              {t("settings.two_factor.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent dir={textDir} className={cn(SETTINGS_DIALOG_CONTENT, "max-w-md")}>
          <DialogHeader>
            <DialogTitle>{t("settings.two_factor.regenerate_title")}</DialogTitle>
            <DialogDescription>{t("settings.two_factor.regenerate_hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {regenErr ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {regenErr}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="user-twofa-regen-pw">{t("settings.two_factor.password_label")}</Label>
              <Input
                id="user-twofa-regen-pw"
                type="password"
                autoComplete="current-password"
                value={regenPassword}
                disabled={regenBusy}
                onChange={(e) => setRegenPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-twofa-regen-code">{t("settings.two_factor.code_label")}</Label>
              <Input
                id="user-twofa-regen-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={regenCode}
                disabled={regenBusy}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-11 dir-ltr"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button type="button" disabled={regenBusy} onClick={() => void submitRegen()}>
              {regenBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("settings.two_factor.regenerate_submit")}
            </Button>
            <Button type="button" variant="outline" disabled={regenBusy} onClick={() => setRegenOpen(false)}>
              {t("settings.two_factor.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  KeyRound,
  Loader2,
  QrCode,
  Shield,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  admin2faDisable,
  admin2faSetupConfirm,
  admin2faSetupQr,
  admin2faSetupStart,
} from "@/features/admin/api";
import {
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_TOOLBAR_PRIMARY,
  DIALOG_SURFACE,
  INPUT_FIELD,
} from "@/features/admin/admin-interaction-classes";
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
import { t } from "@/i18n";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { cn } from "@/lib/utils";

const LIME_RING =
  "border-lime-400/30 bg-zinc-950/80 shadow-[0_0_32px_-14px_rgba(163,230,53,0.4)] ring-1 ring-lime-500/20";
const LIME_GLOW_BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-lime-400/35 bg-lime-500/10 px-2.5 py-0.5 text-[11px] font-medium text-lime-200 ring-1 ring-lime-400/15";

type Props = {
  twoFactorEnabled: boolean;
  onStatusChanged: () => void;
};

export function AdminTwoFactorSettings({ twoFactorEnabled, onStatusChanged }: Props) {
  const { dir } = useAdminLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
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

  const resetEnableFlow = () => {
    setStep(0);
    setSetupPassword("");
    setTotpCode("");
    setQrDataUrl(null);
    setErr("");
    setBusy(false);
  };

  const handleEnableOpen = (open: boolean) => {
    setEnableOpen(open);
    if (!open) {
      resetEnableFlow();
      setBackupOpen(false);
      setBackupCodes([]);
    }
  };

  const startQrFlow = async () => {
    setErr("");
    if (!setupPassword.trim()) {
      setErr(t("p8.admin.two_factor.err_password_required"));
      return;
    }
    setBusy(true);
    try {
      await admin2faSetupStart(setupPassword);
      const { qrDataUrl: url } = await admin2faSetupQr();
      setQrDataUrl(url);
      setStep(1);
    } catch {
      setErr(t("p8.admin.two_factor.generic_err"));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    setErr("");
    const c = totpCode.trim();
    if (!/^\d{6}$/.test(c)) {
      setErr(t("p8.admin.two_factor.err_code_digits"));
      return;
    }
    setBusy(true);
    try {
      const { backupCodes: codes } = await admin2faSetupConfirm(setupPassword, c);
      setBackupCodes(codes);
      setEnableOpen(false);
      resetEnableFlow();
      setBackupOpen(true);
      onStatusChanged();
      void queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
      toast({ title: t("p8.admin.two_factor.toast_enabled") });
    } catch {
      setErr(t("p8.admin.two_factor.generic_err"));
    } finally {
      setBusy(false);
    }
  };

  const closeBackup = () => {
    setBackupOpen(false);
    setBackupCodes([]);
  };

  const submitDisable = async () => {
    setDisableErr("");
    if (!disablePassword.trim() || !disableCode.trim()) {
      setDisableErr(t("p8.admin.two_factor.err_fill_all"));
      return;
    }
    setDisableBusy(true);
    try {
      await admin2faDisable(disablePassword, disableCode);
      setDisableOpen(false);
      setDisablePassword("");
      setDisableCode("");
      onStatusChanged();
      void queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
      toast({ title: t("p8.admin.two_factor.toast_disabled") });
    } catch {
      setDisableErr(t("p8.admin.two_factor.generic_err"));
    } finally {
      setDisableBusy(false);
    }
  };

  const copyBackups = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast({ title: t("p8.admin.two_factor.copied") });
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border border-zinc-800/90 bg-zinc-950/50 p-4 md:p-5",
          LIME_RING,
        )}
        dir={dir}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-right">
            <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-400/40 bg-lime-500/10 text-lime-300 shadow-[0_0_22px_-10px_rgba(163,230,53,0.55)] ring-1 ring-lime-400/20">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.two_factor.section_title")}</h2>
                <span className={LIME_GLOW_BADGE}>
                  {twoFactorEnabled ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      {t("p8.admin.two_factor.status_on")}
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      {t("p8.admin.two_factor.status_off")}
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("p8.admin.two_factor.section_hint")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!twoFactorEnabled ? (
            <button
              type="button"
              onClick={() => {
                resetEnableFlow();
                setEnableOpen(true);
              }}
              className={cn(
                BTN_TOOLBAR_PRIMARY,
                "inline-flex items-center justify-center gap-2 border-lime-400/35 bg-lime-500/15 px-4 py-2.5 text-sm font-semibold text-lime-100 shadow-[0_0_28px_-12px_rgba(163,230,53,0.5)] hover:bg-lime-500/22",
              )}
            >
              <KeyRound className="h-4 w-4" aria-hidden />
              {t("p8.admin.two_factor.enable")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDisablePassword("");
                setDisableCode("");
                setDisableErr("");
                setDisableOpen(true);
              }}
              className={cn(
                BTN_TOOLBAR_PRIMARY,
                "inline-flex items-center justify-center gap-2 border-red-500/35 bg-red-950/40 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-950/55",
              )}
            >
              <ShieldOff className="h-4 w-4" aria-hidden />
              {t("p8.admin.two_factor.disable")}
            </button>
          )}
        </div>
      </section>

      <Dialog open={enableOpen} onOpenChange={handleEnableOpen}>
        <DialogContent dir={dir} className={cn(DIALOG_SURFACE, "max-w-md border-lime-500/25")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <QrCode className="h-5 w-5 text-lime-400" aria-hidden />
              {step === 0
                ? t("p8.admin.two_factor.step_password")
                : step === 1
                  ? t("p8.admin.two_factor.step_scan")
                  : t("p8.admin.two_factor.step_code")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {step === 1 ? t("p8.admin.two_factor.scan_hint") : null}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            {err ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {err}
              </p>
            ) : null}

            {step === 0 ? (
              <div className="space-y-2">
                <Label htmlFor="twofa-setup-pw" className="text-muted-foreground">
                  {t("p8.admin.two_factor.password_label")}
                </Label>
                <Input
                  id="twofa-setup-pw"
                  type="password"
                  autoComplete="current-password"
                  value={setupPassword}
                  disabled={busy}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className={cn(INPUT_FIELD, "h-11")}
                />
              </div>
            ) : null}

            {step === 1 && qrDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className={cn(
                    "rounded-2xl border border-lime-400/25 bg-white p-3 shadow-[0_0_40px_-16px_rgba(163,230,53,0.65)] ring-2 ring-lime-400/15",
                  )}
                >
                  <img
                    src={qrDataUrl}
                    alt={t("p8.admin.two_factor.qr_alt")}
                    className="h-44 w-44 max-w-full md:h-52 md:w-52"
                    decoding="async"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={BTN_MODAL_GHOST}
                  disabled={busy}
                  onClick={() => setStep(2)}
                >
                  {t("p8.admin.two_factor.next")}
                </Button>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2">
                <Label htmlFor="twofa-first-code" className="text-muted-foreground">
                  {t("p8.admin.two_factor.code_label")}
                </Label>
                <Input
                  id="twofa-first-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={totpCode}
                  disabled={busy}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={cn(INPUT_FIELD, "h-11 text-center text-lg tracking-[0.35em]", "dir-ltr")}
                  dir="ltr"
                  placeholder="••••••"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:justify-start sm:gap-2 sm:space-x-0">
            {step === 0 ? (
              <Button
                type="button"
                className={cn(BTN_MODAL_PRIMARY, "bg-lime-600 text-black hover:bg-lime-500")}
                disabled={busy}
                onClick={() => void startQrFlow()}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t("p8.admin.two_factor.open_enable")}
                  </span>
                ) : (
                  t("p8.admin.two_factor.open_enable")
                )}
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                type="button"
                variant="outline"
                className={BTN_MODAL_GHOST}
                disabled={busy}
                onClick={() => {
                  setStep(0);
                  setQrDataUrl(null);
                }}
              >
                {t("p8.admin.two_factor.back")}
              </Button>
            ) : null}
            {step === 2 ? (
              <>
                <Button
                  type="button"
                  className={cn(BTN_MODAL_PRIMARY, "bg-lime-600 text-black hover:bg-lime-500")}
                  disabled={busy}
                  onClick={() => void confirmEnable()}
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {t("p8.admin.two_factor.confirm")}
                    </span>
                  ) : (
                    t("p8.admin.two_factor.confirm")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={BTN_MODAL_GHOST}
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  {t("p8.admin.two_factor.back")}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={backupOpen} onOpenChange={(o) => !o && closeBackup()}>
        <DialogContent dir={dir} className={cn(DIALOG_SURFACE, "max-w-lg border-amber-500/30")}>
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="text-amber-100">{t("p8.admin.two_factor.backup_title")}</DialogTitle>
            <DialogDescription className="text-amber-200/85">{t("p8.admin.two_factor.backup_warn")}</DialogDescription>
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
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              onClick={() => void copyBackups()}
            >
              <Copy className="ms-1 h-4 w-4" aria-hidden />
              {t("p8.admin.two_factor.copy_all")}
            </Button>
            <Button
              type="button"
              className={cn(BTN_MODAL_PRIMARY, "bg-amber-600 text-black hover:bg-amber-500")}
              onClick={closeBackup}
            >
              {t("p8.admin.two_factor.saved_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent dir={dir} className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>{t("p8.admin.two_factor.disable_title")}</DialogTitle>
            <DialogDescription>{t("p8.admin.two_factor.disable_hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {disableErr ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {disableErr}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="twofa-dis-pw">{t("p8.admin.two_factor.password_label")}</Label>
              <Input
                id="twofa-dis-pw"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                disabled={disableBusy}
                onChange={(e) => setDisablePassword(e.target.value)}
                className={cn(INPUT_FIELD, "h-11")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twofa-dis-code">{t("p8.admin.two_factor.disable_code_label")}</Label>
              <Input
                id="twofa-dis-code"
                autoComplete="one-time-code"
                value={disableCode}
                disabled={disableBusy}
                onChange={(e) => setDisableCode(e.target.value)}
                className={cn(INPUT_FIELD, "h-11")}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={disableBusy}
              onClick={() => void submitDisable()}
            >
              {disableBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                t("p8.admin.two_factor.disable_submit")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              disabled={disableBusy}
              onClick={() => setDisableOpen(false)}
            >
              {t("p8.admin.two_factor.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

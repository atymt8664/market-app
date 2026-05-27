import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Lock, Settings, Shield } from "lucide-react";
import { adminLogout, changeAdminPassword, getAdminSettings } from "@/features/admin/api";
import {
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_TOOLBAR_PRIMARY,
  CARD_SHELL,
  DIALOG_SURFACE,
  INPUT_FIELD,
  SUB_CARD,
} from "@/features/admin/admin-interaction-classes";
import {
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { AdminTwoFactorSettings } from "@/features/admin/components/admin-two-factor-settings";
import { useRequireAdmin } from "@/features/admin/hooks";
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
import { cn } from "@/lib/utils";

function validateStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  show,
  onToggleShow,
  disabled,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <div className="relative" dir="ltr">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(INPUT_FIELD, "h-11 pr-10", error && "border-red-500/50")}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={onToggleShow}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg border border-transparent p-1.5 text-muted-foreground transition hover:bg-zinc-800 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-40"
          aria-label={show ? t("p8.admin.settings.hide") : t("p8.admin.settings.show")}
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();

  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: ({ signal }) => getAdminSettings(signal),
    enabled: Boolean(meQuery.data?.isAdmin),
    staleTime: 30_000,
  });

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const resetPwForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCur(false);
    setShowNew(false);
    setShowCf(false);
    setFieldErrors({});
    setSubmitError("");
  };

  const handlePwOpenChange = (open: boolean) => {
    setPwOpen(open);
    if (!open) resetPwForm();
  };

  const validateClient = (): boolean => {
    const next: Record<string, string> = {};
    if (!currentPassword.trim()) next.current = t("p8.admin.settings.err_current");
    if (!validateStrongPassword(newPassword)) next.new = t("p8.admin.settings.err_weak");
    if (newPassword !== confirmPassword) next.confirm = t("p8.admin.settings.err_mismatch");
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitPasswordChange = async () => {
    setSubmitError("");
    if (!validateClient()) return;
    setSaving(true);
    try {
      await changeAdminPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword,
      });
      toast({
        title: t("p8.admin.settings.success_title"),
        description: t("p8.admin.settings.success_desc"),
      });
      resetPwForm();
      setPwOpen(false);
      navigate("/admin-login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("p8.admin.common.error_generic");
      setSubmitError(msg);
      toast({
        title: t("p8.admin.settings.pw_change_fail"),
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]" dir="rtl">
        <AdminPageLoading message={t("p8.admin.settings.loading")} />
      </div>
    );
  }

  const settings = settingsQuery.data;

  return (
    <AdminShell activeKey="settings" onLogout={handleLogout}>
      <div className="space-y-5" dir="rtl">
        <header className={cn("flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between", CARD_SHELL)}>
          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <Settings className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("p8.admin.settings.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("p8.admin.settings.subtitle")}</p>
          </div>
        </header>

        <section className={cn(CARD_SHELL, "p-4 md:p-5")}>
          <h2 className="mb-1 text-lg font-semibold text-foreground">{t("p8.admin.settings.general_section")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("p8.admin.settings.general_hint")}</p>

          {settingsQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.settings.loading")} className="py-8" />
          ) : settingsQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.settings.load_error")}
              description={t("p8.admin.settings.load_error_hint")}
              onRetry={() => void settingsQuery.refetch()}
            />
          ) : settings ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.15)] ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.app_name")}</p>
                <p className="mt-1 font-medium text-foreground">{settings.appName}</p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.version")}</p>
                <p className="mt-1 font-medium tabular-nums text-foreground" dir="ltr">
                  {settings.appVersion}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.email")}</p>
                <p className="mt-1 break-all font-medium text-foreground" dir="ltr">
                  {settings.supportEmail}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.ad_approval")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {settings.requireAdApproval ? t("p8.admin.settings.yes") : t("p8.admin.settings.no")}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.reports")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {settings.reportsEnabled ? t("p8.admin.settings.yes") : t("p8.admin.settings.no")}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
                <p className="text-xs text-muted-foreground">{t("p8.admin.settings.support")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {settings.supportEnabled ? t("p8.admin.settings.yes") : t("p8.admin.settings.no")}
                </p>
              </div>
              {settings.updatedAt ? (
                <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-primary/20 bg-zinc-900/40 px-4 py-3 text-sm text-muted-foreground ring-1 ring-primary/8">
                  {t("p8.admin.settings.last_updated")}:{" "}
                  <span className="tabular-nums text-foreground">
                    {new Date(settings.updatedAt).toLocaleString("ar-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {settings ? (
          <AdminTwoFactorSettings
            twoFactorEnabled={settings.admin2faEnabled === true}
            onStatusChanged={() => {
              void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
              void queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
            }}
          />
        ) : null}

        <section className={cn(SUB_CARD, "p-4 md:p-5")}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-right">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
                <Shield className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.settings.security_section")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("p8.admin.settings.session_hint")}</p>
              </div>
            </div>
            {meQuery.data?.isAdmin ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/20">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.45)]" />
                {t("p8.admin.settings.session_ok")}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className={cn(
              BTN_TOOLBAR_PRIMARY,
              "flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold shadow-[0_0_22px_-10px_hsl(var(--primary)/0.45)] sm:w-auto",
            )}
          >
            <Lock className="h-4 w-4" aria-hidden />
            {t("p8.admin.settings.change_pw")}
          </button>
        </section>
      </div>

      <Dialog open={pwOpen} onOpenChange={handlePwOpenChange}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{t("p8.admin.settings.modal_title")}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("p8.admin.settings.modal_hint")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <p className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 text-xs text-muted-foreground ring-1 ring-primary/10">
              {t("p8.admin.settings.validation_rules")}
            </p>

            <PasswordField
              id="admin-cur-pw"
              label={t("p8.admin.settings.current")}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              show={showCur}
              onToggleShow={() => setShowCur((v) => !v)}
              disabled={saving}
              error={fieldErrors.current}
            />
            <PasswordField
              id="admin-new-pw"
              label={t("p8.admin.settings.new_pw")}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              disabled={saving}
              error={fieldErrors.new}
            />
            <PasswordField
              id="admin-cf-pw"
              label={t("p8.admin.settings.confirm_pw")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              show={showCf}
              onToggleShow={() => setShowCf((v) => !v)}
              disabled={saving}
              error={fieldErrors.confirm}
            />

            {submitError ? (
              <p className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/20">
                {submitError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:justify-start sm:gap-2 sm:space-x-0">
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={saving}
              onClick={() => submitPasswordChange()}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("p8.admin.settings.save")}
                </span>
              ) : (
                t("p8.admin.settings.save")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              disabled={saving}
              onClick={() => handlePwOpenChange(false)}
            >
              {t("p8.admin.settings.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

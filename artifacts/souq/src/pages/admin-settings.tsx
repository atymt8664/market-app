import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Lock, RotateCcw, Save, Settings, Shield } from "lucide-react";
import {
  adminLogout,
  changeAdminPassword,
  getAdminSettings,
  updateAdminSettings,
  type AdminAppSettings,
  type AdminSettingsUpdatePayload,
} from "@/features/admin/api";
import { toastAdminAction, toastAdminError } from "@/features/admin/admin-action-toast";
import {
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_TOOLBAR_OUTLINE,
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
import { AdminLanguageSettings } from "@/features/admin/components/admin-language-settings";
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
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
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

type SettingsFormDraft = AdminSettingsUpdatePayload;

function settingsToDraft(settings: AdminAppSettings): SettingsFormDraft {
  return {
    appName: settings.appName,
    appVersion: settings.appVersion,
    supportEmail: settings.supportEmail,
    requireAdApproval: settings.requireAdApproval,
    reportsEnabled: settings.reportsEnabled,
    supportEnabled: settings.supportEnabled,
    termsPath: settings.termsPath,
    privacyPath: settings.privacyPath,
  };
}

function draftsEqual(a: SettingsFormDraft, b: SettingsFormDraft): boolean {
  return (
    a.appName === b.appName &&
    a.appVersion === b.appVersion &&
    a.supportEmail === b.supportEmail &&
    a.requireAdApproval === b.requireAdApproval &&
    a.reportsEnabled === b.reportsEnabled &&
    a.supportEnabled === b.supportEnabled &&
    a.termsPath === b.termsPath &&
    a.privacyPath === b.privacyPath
  );
}

function validateSettingsDraft(draft: SettingsFormDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.appName.trim()) errors.appName = t("p8.admin.settings.err_app_name");
  if (!draft.appVersion.trim()) errors.appVersion = t("p8.admin.settings.err_version");
  const email = draft.supportEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.supportEmail = t("p8.admin.settings.err_email");
  }
  for (const key of ["termsPath", "privacyPath"] as const) {
    const value = draft[key].trim();
    if (value && !value.startsWith("/")) {
      errors[key] = t("p8.admin.settings.err_path");
    }
  }
  return errors;
}

function SettingsToggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-3 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <Label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </Label>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            BTN_FIX,
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            checked
              ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25"
              : "border-zinc-600/70 bg-zinc-900/90 text-muted-foreground hover:border-primary/35 hover:text-foreground",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {checked ? t("p8.admin.settings.yes") : t("p8.admin.settings.no")}
        </button>
      </div>
    </div>
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
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
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
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [draft, setDraft] = useState<SettingsFormDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<SettingsFormDraft | null>(null);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<Record<string, string>>({});

  const syncDraftFromSettings = useCallback((data: AdminAppSettings) => {
    const next = settingsToDraft(data);
    setDraft(next);
    setSavedDraft(next);
    setSettingsFieldErrors({});
  }, []);

  useEffect(() => {
    if (settingsQuery.data) {
      syncDraftFromSettings(settingsQuery.data);
    }
  }, [settingsQuery.data, syncDraftFromSettings]);

  const isSettingsDirty = useMemo(() => {
    if (!draft || !savedDraft) return false;
    return !draftsEqual(draft, savedDraft);
  }, [draft, savedDraft]);

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

  const resetSettingsForm = () => {
    if (savedDraft) {
      setDraft(savedDraft);
      setSettingsFieldErrors({});
    }
  };

  const submitSettingsUpdate = async () => {
    if (!draft) return;
    setSettingsFieldErrors({});
    const errors = validateSettingsDraft(draft);
    if (Object.keys(errors).length > 0) {
      setSettingsFieldErrors(errors);
      return;
    }
    const payload: AdminSettingsUpdatePayload = {
      appName: draft.appName.trim(),
      appVersion: draft.appVersion.trim(),
      supportEmail: draft.supportEmail.trim().toLowerCase(),
      requireAdApproval: draft.requireAdApproval,
      reportsEnabled: draft.reportsEnabled,
      supportEnabled: draft.supportEnabled,
      termsPath: draft.termsPath.trim() || "/terms",
      privacyPath: draft.privacyPath.trim() || "/privacy",
    };
    setSettingsSaving(true);
    try {
      const { settings, feedback } = await updateAdminSettings(payload);
      const nextDraft = settingsToDraft(settings);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      queryClient.setQueryData(["admin", "settings"], settings);
      toastAdminAction(toast, feedback, t("p8.admin.settings.update_success"));
    } catch (e) {
      toastAdminError(toast, e);
    } finally {
      setSettingsSaving(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.settings.loading")} />
      </div>
    );
  }

  const settings = settingsQuery.data;

  return (
    <AdminShell activeKey="settings" onLogout={handleLogout}>
      <div className="space-y-5">
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
          ) : settings && draft ? (
            <div className="space-y-5">
              {isSettingsDirty ? (
                <p
                  className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-right text-xs text-amber-100/90 ring-1 ring-amber-500/15"
                  role="status"
                >
                  {t("p8.admin.settings.unsaved_hint")}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="admin-settings-app-name" className="text-muted-foreground">
                    {t("p8.admin.settings.app_name")}
                  </Label>
                  <Input
                    id="admin-settings-app-name"
                    value={draft.appName}
                    disabled={settingsSaving}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, appName: e.target.value } : prev))}
                    className={cn(INPUT_FIELD, settingsFieldErrors.appName && "border-red-500/50")}
                    aria-invalid={Boolean(settingsFieldErrors.appName)}
                  />
                  {settingsFieldErrors.appName ? (
                    <p className="text-xs text-red-400">{settingsFieldErrors.appName}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-settings-version" className="text-muted-foreground">
                    {t("p8.admin.settings.version")}
                  </Label>
                  <Input
                    id="admin-settings-version"
                    dir="ltr"
                    value={draft.appVersion}
                    disabled={settingsSaving}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, appVersion: e.target.value } : prev))}
                    className={cn(INPUT_FIELD, settingsFieldErrors.appVersion && "border-red-500/50")}
                    aria-invalid={Boolean(settingsFieldErrors.appVersion)}
                  />
                  {settingsFieldErrors.appVersion ? (
                    <p className="text-xs text-red-400">{settingsFieldErrors.appVersion}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-settings-email" className="text-muted-foreground">
                    {t("p8.admin.settings.email")}
                  </Label>
                  <Input
                    id="admin-settings-email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={draft.supportEmail}
                    disabled={settingsSaving}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, supportEmail: e.target.value } : prev))}
                    className={cn(INPUT_FIELD, settingsFieldErrors.supportEmail && "border-red-500/50")}
                    aria-invalid={Boolean(settingsFieldErrors.supportEmail)}
                  />
                  {settingsFieldErrors.supportEmail ? (
                    <p className="text-xs text-red-400">{settingsFieldErrors.supportEmail}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{t("p8.admin.settings.toggles_section")}</h3>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <SettingsToggle
                    id="admin-settings-ad-approval"
                    label={t("p8.admin.settings.ad_approval")}
                    hint={t("p8.admin.settings.ad_approval_hint")}
                    checked={draft.requireAdApproval}
                    disabled={settingsSaving}
                    onChange={(requireAdApproval) =>
                      setDraft((prev) => (prev ? { ...prev, requireAdApproval } : prev))
                    }
                  />
                  <SettingsToggle
                    id="admin-settings-reports"
                    label={t("p8.admin.settings.reports")}
                    hint={t("p8.admin.settings.reports_hint")}
                    checked={draft.reportsEnabled}
                    disabled={settingsSaving}
                    onChange={(reportsEnabled) =>
                      setDraft((prev) => (prev ? { ...prev, reportsEnabled } : prev))
                    }
                  />
                  <SettingsToggle
                    id="admin-settings-support"
                    label={t("p8.admin.settings.support")}
                    hint={t("p8.admin.settings.support_hint")}
                    checked={draft.supportEnabled}
                    disabled={settingsSaving}
                    onChange={(supportEnabled) =>
                      setDraft((prev) => (prev ? { ...prev, supportEnabled } : prev))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-right">
                  <h3 className="text-sm font-semibold text-foreground">{t("p8.admin.settings.paths_section")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t("p8.admin.settings.paths_hint")}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-settings-terms" className="text-muted-foreground">
                      {t("p8.admin.settings.terms_path")}
                    </Label>
                    <Input
                      id="admin-settings-terms"
                      dir="ltr"
                      value={draft.termsPath}
                      disabled={settingsSaving}
                      onChange={(e) => setDraft((prev) => (prev ? { ...prev, termsPath: e.target.value } : prev))}
                      className={cn(INPUT_FIELD, settingsFieldErrors.termsPath && "border-red-500/50")}
                      aria-invalid={Boolean(settingsFieldErrors.termsPath)}
                    />
                    {settingsFieldErrors.termsPath ? (
                      <p className="text-xs text-red-400">{settingsFieldErrors.termsPath}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-settings-privacy" className="text-muted-foreground">
                      {t("p8.admin.settings.privacy_path")}
                    </Label>
                    <Input
                      id="admin-settings-privacy"
                      dir="ltr"
                      value={draft.privacyPath}
                      disabled={settingsSaving}
                      onChange={(e) => setDraft((prev) => (prev ? { ...prev, privacyPath: e.target.value } : prev))}
                      className={cn(INPUT_FIELD, settingsFieldErrors.privacyPath && "border-red-500/50")}
                      aria-invalid={Boolean(settingsFieldErrors.privacyPath)}
                    />
                    {settingsFieldErrors.privacyPath ? (
                      <p className="text-xs text-red-400">{settingsFieldErrors.privacyPath}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {settings.updatedAt ? (
                <p className="text-sm text-muted-foreground">
                  {t("p8.admin.settings.last_updated")}:{" "}
                  <span className="tabular-nums text-foreground">
                    {formatDateTime(settings.updatedAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-primary/15 pt-4">
                <button
                  type="button"
                  disabled={settingsSaving || !isSettingsDirty}
                  onClick={resetSettingsForm}
                  className={cn(
                    BTN_FIX,
                    BTN_TOOLBAR_OUTLINE,
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium disabled:opacity-50",
                  )}
                >
                  <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                  {t("p8.admin.settings.reset")}
                </button>
                <button
                  type="button"
                  disabled={settingsSaving || !isSettingsDirty}
                  onClick={() => void submitSettingsUpdate()}
                  className={cn(
                    BTN_FIX,
                    BTN_TOOLBAR_PRIMARY,
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold shadow-[0_0_22px_-10px_hsl(var(--primary)/0.45)] disabled:opacity-50",
                  )}
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {t("p8.admin.settings.save_settings")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 shrink-0" aria-hidden />
                      {t("p8.admin.settings.save_settings")}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <AdminLanguageSettings />

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
        <DialogContent className={cn(DIALOG_SURFACE, "max-w-md")}>
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

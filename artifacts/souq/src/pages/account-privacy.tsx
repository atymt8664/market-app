import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  Download,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Trash2,
  Users,
} from "lucide-react";
import {
  getAuthProfileCsrfTokenForRequest,
  clearAuthProfileCsrfToken,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
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
import { clearUserSessionQueries } from "@/lib/clear-session-query-cache";
import { appendReturnToQuery } from "@/lib/return-navigation";
import {
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_HUB_LIST_ROW_HINT,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_INPUT,
  SETTINGS_INPUT_ICON_BUTTON,
  SETTINGS_INPUT_ICON_CLASS,
  SETTINGS_LABEL,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";
import {
  SETTINGS_ROW_DIVIDER,
  SettingsHubRow,
  SettingsHubSection,
} from "@/components/settings-hub-list";

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

export default function AccountPrivacy() {
  const { user, isLoading } = useAuth();
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  if (!isLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/privacy" />;
  }

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
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("account_info.privacy.title")} />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        <SettingsHubSection>
          <SettingsHubRow
            icon={<Mail className="w-4 h-4" />}
            label={t("settings.privacy.row.contact")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Users className="w-4 h-4" />}
            label={t("settings.privacy.row.blocked")}
            hint={t("settings.privacy.row.blocked_hint")}
            onClick={() => navigate(appendReturnToQuery("/account/privacy/blocked", "/account/privacy"))}
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            hintClassName={SETTINGS_HUB_LIST_ROW_HINT}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Download className="w-4 h-4" />}
            label={t("settings.privacy.row.export")}
            soon
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
          <SettingsHubRow
            icon={<Trash2 className="w-4 h-4" />}
            label={t("settings.account.delete_placeholder_title")}
            onClick={() => handleDeleteDialogOpenChange(true)}
            destructive
            labelClassName={SETTINGS_HUB_LIST_ROW_LABEL}
            dividerClassName={SETTINGS_ROW_DIVIDER}
          />
        </SettingsHubSection>
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
                <label htmlFor="delete-account-password-privacy" className={SETTINGS_LABEL}>
                  {t("settings.account.delete.password_label")}
                </label>
                <div className="relative">
                  <input
                    id="delete-account-password-privacy"
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
    </div>
  );
}

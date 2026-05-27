import { useState } from "react";
import { useLocation } from "wouter";
import { KeyRound, Loader2, Shield } from "lucide-react";
import { changeAdminStaffInitialPassword } from "@/features/admin/api";
import { useRequireAdmin } from "@/features/admin/hooks";
import { useAdminAccess } from "@/features/admin/access";
import {
  AUTH_CARD,
  AUTH_HEADER,
  AUTH_HEADER_TITLE,
  AUTH_INPUT,
  AUTH_PAGE_BG,
} from "@/lib/auth-page-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { BTN_MODAL_PRIMARY, CARD_SHELL, INPUT_FIELD } from "@/features/admin/admin-interaction-classes";

export default function AdminForcePasswordChangePage() {
  useRequireAdmin();
  const access = useAdminAccess();
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setError(t("p8.admin.staff.force_pw_mismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changeAdminStaffInitialPassword({ newPassword, confirmPassword });
      window.location.href = access.homePath || "/admin";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("p8.admin.staff.force_pw_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(AUTH_PAGE_BG, "flex min-h-screen items-center justify-center p-4")} dir="rtl">
      <div className={cn(CARD_SHELL, "w-full max-w-md p-6")}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className={cn(AUTH_HEADER_TITLE, "text-lg font-bold")}>{t("p8.admin.staff.force_pw_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("p8.admin.staff.force_pw_subtitle")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pw">{t("p8.admin.staff.force_pw_new")}</Label>
            <Input
              id="new-pw"
              type="password"
              className={INPUT_FIELD}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">{t("p8.admin.staff.force_pw_confirm")}</Label>
            <Input
              id="confirm-pw"
              type="password"
              className={INPUT_FIELD}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("p8.admin.staff.force_pw_rules")}</p>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="button" className={BTN_MODAL_PRIMARY} onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {t("p8.admin.staff.force_pw_submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

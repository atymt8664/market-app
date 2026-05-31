import { useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import {
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  DIALOG_SURFACE,
  INPUT_FIELD,
} from "@/features/admin/admin-interaction-classes";
import { useAdminStaffList } from "@/features/admin/hooks";
import { AdminSelectField } from "@/features/admin/components/admin-select-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { cn } from "@/lib/utils";

type StaffAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  currentAssignee?: string | null;
  busy?: boolean;
  onConfirm: (staffActorId: number) => void;
};

export function StaffAssignDialog({
  open,
  onOpenChange,
  title,
  description,
  currentAssignee,
  busy = false,
  onConfirm,
}: StaffAssignDialogProps) {
  const { dir } = useAdminLocale();
  const staffQuery = useAdminStaffList({ page: 1, pageSize: 100 }, open);
  const [staffActorId, setStaffActorId] = useState("");

  const staffOptions =
    staffQuery.data?.items
      ?.filter((s) => s.status === "active")
      .map((s) => ({
        value: String(s.adminActorId),
        label: `${s.displayName} · ${s.roleKey}`,
      })) ?? [];

  const handleConfirm = () => {
    const id = Number(staffActorId);
    if (!Number.isInteger(id) || id <= 0) return;
    onConfirm(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DIALOG_SURFACE, "max-w-md")} dir={dir}>
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserCog className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-right text-muted-foreground">{description}</DialogDescription>
          ) : null}
          {currentAssignee ? (
            <p className="text-right text-sm text-muted-foreground">
              {t("p8.admin.workflow.current_assignee_label")}:{" "}
              <span className="font-medium text-foreground">{currentAssignee}</span>
            </p>
          ) : null}
        </DialogHeader>

        {staffQuery.isLoading ? (
          <div className="flex justify-center py-6 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : (
          <label className="block space-y-2 text-right text-sm">
            <span className="text-muted-foreground">{t("p8.admin.workflow.select_staff")}</span>
            <AdminSelectField
              value={staffActorId}
              onValueChange={setStaffActorId}
              options={staffOptions}
              placeholder={t("p8.admin.workflow.select_staff_placeholder")}
              triggerClassName={INPUT_FIELD}
              disabled={busy}
            />
          </label>
        )}

        <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
          <button
            type="button"
            disabled={busy || !staffActorId}
            onClick={handleConfirm}
            className={cn(BTN_MODAL_PRIMARY, "min-w-[7rem]")}
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("p8.admin.workflow.confirm_assign")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className={BTN_MODAL_GHOST}
          >
            {t("p8.admin.common.cancel")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

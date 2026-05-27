import { useState } from "react";
import { MODERATION_REASON_PRESET_KEYS } from "@/features/admin/staff-workflow-types";
import { BTN_FIX, DIALOG_SURFACE } from "@/features/admin/admin-interaction-classes";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

type ModerationReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
};

export function ModerationReasonDialog({
  open,
  title,
  description,
  confirmLabel = t("p8.admin.common.confirm"),
  onConfirm,
  onOpenChange,
}: ModerationReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t("p8.admin.moderation.reason_required"));
      return;
    }
    setError("");
    onConfirm(trimmed);
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(DIALOG_SURFACE, "max-w-md")} dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-2">
            {MODERATION_REASON_PRESET_KEYS.map((presetKey) => {
              const preset = t(presetKey);
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => {
                    setReason(preset);
                    setError("");
                  }}
                  className={cn(
                    BTN_FIX,
                    "rounded-full border border-primary/30 bg-zinc-900/80 px-3 py-1 text-xs text-foreground hover:border-primary/50",
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            rows={3}
            placeholder={t("p8.admin.moderation.reason_placeholder")}
            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel className={cn(BTN_FIX, buttonVariants({ variant: "outline" }))}>
            {t("p8.admin.common.cancel")}
          </AlertDialogCancel>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(BTN_FIX, buttonVariants({ variant: "default" }))}
          >
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

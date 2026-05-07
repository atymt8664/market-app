import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvatarCircle } from "@/components/avatar-circle";
import { SETTINGS_OUTLINE_BUTTON } from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const dialogShell =
  "gap-0 overflow-hidden border border-primary/40 bg-[#0A0A0A]/98 p-0 text-right shadow-[0_0_32px_-12px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15 sm:max-w-lg";

const actionsCard =
  "rounded-2xl border border-primary/35 bg-zinc-950/90 p-3 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  avatarUrl?: string | null;
  /** صاحب الحساب فقط — يظهر تعديل/حذف عند وجود صورة */
  canManage: boolean;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProfileAvatarPreviewDialog({
  open,
  onOpenChange,
  name,
  avatarUrl,
  canManage,
  busy,
  onEdit,
  onDelete,
}: Props) {
  const showManage = canManage && Boolean(avatarUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className={cn(dialogShell, "!rounded-2xl")}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t("profile.avatar_preview.title")}</DialogTitle>
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto px-4 pb-3 pt-10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="max-h-[min(70vh,520px)] w-auto max-w-full rounded-2xl border border-primary/25 object-contain shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <AvatarCircle name={name} src={undefined} size={200} />
              </div>
            )}
          </div>

          {showManage ? (
            <div className="border-t border-primary/20 bg-black/40 px-4 py-4">
              <div className={actionsCard}>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onOpenChange(false);
                      onEdit();
                    }}
                    className={cn(
                      SETTINGS_OUTLINE_BUTTON,
                      "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-primary/40 px-4 py-3 text-sm font-semibold",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Pencil className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                    )}
                    {t("profile.avatar_modal.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onOpenChange(false);
                      onDelete();
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/45 bg-red-950/35 px-4 py-3 text-sm font-semibold text-red-100 shadow-[0_0_18px_-12px_rgba(239,68,68,0.28)] ring-1 ring-red-500/20 transition-colors hover:border-red-500/55 hover:bg-red-950/50 disabled:opacity-60",
                    )}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    {t("profile.avatar_modal.remove")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** زر كاميرا صغير للـ fallback فقط — يظهر عندما لا توجد صورة وصاحب الحساب */
export function ProfileAvatarCameraBadge({
  onClick,
  disabled,
  busy,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={t("profile.change_avatar")}
      className="absolute -bottom-0.5 -left-0.5 z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-[#b6e356] text-black shadow-[0_0_8px_-1px_rgba(182,227,86,0.4)] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Camera className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

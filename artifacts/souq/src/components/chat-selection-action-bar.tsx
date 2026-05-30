import { Copy, Trash2, X } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type ChatSelectionActionBarProps = {
  dirRtl: boolean;
  selectedCount: number;
  canDeleteForEveryone: boolean;
  canCopy: boolean;
  busy: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onCopy: () => void;
  onCancel: () => void;
};

const ACTION_BTN =
  "inline-flex min-h-[2.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition-[border-color,background-color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 sm:text-xs";

export function ChatSelectionActionBar({
  dirRtl,
  selectedCount,
  canDeleteForEveryone,
  canCopy,
  busy,
  onDeleteForMe,
  onDeleteForEveryone,
  onCopy,
  onCancel,
}: ChatSelectionActionBarProps) {
  return (
    <div
      className="flex w-full shrink-0 flex-col gap-2 border-t border-primary/28 bg-[#0A0A0A] px-3 py-3 shadow-[0_-6px_28px_-10px_rgba(0,0,0,0.55)]"
      dir={dirRtl ? "rtl" : "ltr"}
      role="toolbar"
      aria-label={t("message_thread.select_count", { count: selectedCount })}
    >
      <p className="text-center text-xs font-medium text-zinc-400">
        {t("message_thread.select_count", { count: selectedCount })}
      </p>
      <div className={cn("flex flex-wrap items-stretch justify-center gap-2", dirRtl && "flex-row-reverse")}>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={onDeleteForMe}
          className={cn(
            ACTION_BTN,
            "border-red-500/35 bg-red-950/30 text-red-100 hover:border-red-500/50 hover:bg-red-950/45",
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t("message_thread.select_delete_for_me")}</span>
        </button>
        {canDeleteForEveryone ? (
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={onDeleteForEveryone}
            className={cn(
              ACTION_BTN,
              "border-amber-500/35 bg-amber-950/25 text-amber-50 hover:border-amber-500/50 hover:bg-amber-950/40",
            )}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t("message_thread.select_delete_for_everyone")}</span>
          </button>
        ) : null}
        {canCopy ? (
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={onCopy}
            className={cn(
              ACTION_BTN,
              "border-primary/35 bg-[#0A0A0A] text-white hover:border-primary/55 hover:bg-black/30",
            )}
          >
            <Copy className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{t("message_thread.select_copy")}</span>
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={cn(
            ACTION_BTN,
            "max-w-[5.5rem] border-primary/30 bg-[#0A0A0A]/80 text-zinc-300 hover:border-primary/45 hover:text-white",
          )}
        >
          <X className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t("message_thread.select_cancel")}</span>
        </button>
      </div>
    </div>
  );
}

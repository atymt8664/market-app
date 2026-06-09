import { BellOff, ListX, Pin, Trash2, X } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type ChatInboxSelectionHeaderProps = {
  selectedCount: number;
  totalCount: number;
  actionsDisabled?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPin: () => void;
  onMute: () => void;
  onHide: () => void;
  onDelete: () => void;
  className?: string;
};

const ACTION_CHIP =
  "inline-flex min-h-[2.25rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-semibold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

export function ChatInboxSelectionHeader({
  selectedCount,
  totalCount,
  actionsDisabled,
  onSelectAll,
  onClearSelection,
  onPin,
  onMute,
  onHide,
  onDelete,
  className,
}: ChatInboxSelectionHeaderProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const hasSelection = selectedCount > 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-primary/25 bg-[#0A0A0A]/98 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.45)]",
        className,
      )}
      dir="rtl"
      role="toolbar"
      aria-label={t("p5.chat.inbox.selection_count", { count: selectedCount })}
    >
      <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-2 px-3 py-2.5 md:px-6">
        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex h-9 min-w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-2.5 text-[12px] font-semibold text-zinc-200 transition-colors hover:border-primary/45 hover:bg-black/80"
        >
          <X className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("p5.chat.inbox.clear_selection")}</span>
        </button>

        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tabular-nums text-foreground">
          {t("p5.chat.inbox.selection_count", { count: selectedCount })}
        </p>

        <button
          type="button"
          onClick={onSelectAll}
          disabled={totalCount === 0 || allSelected}
          className="inline-flex h-9 min-w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-2.5 text-[12px] font-semibold text-primary shadow-[0_0_14px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/55 hover:bg-primary/16 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t("p5.chat.inbox.select_all")}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-[820px] gap-2 overflow-x-auto px-3 pb-2.5 md:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          disabled={!hasSelection || actionsDisabled}
          onClick={onPin}
          className={cn(
            ACTION_CHIP,
            "border-primary/35 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/16",
          )}
        >
          <Pin className="h-3.5 w-3.5" aria-hidden />
          <span>{t("p5.chat.inbox.action_pin")}</span>
        </button>
        <button
          type="button"
          disabled={!hasSelection || actionsDisabled}
          onClick={onMute}
          className={cn(
            ACTION_CHIP,
            "border-primary/30 bg-[#0A0A0A]/90 text-zinc-100 hover:border-primary/45 hover:bg-black/85",
          )}
        >
          <BellOff className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>{t("p5.chat.inbox.action_mute")}</span>
        </button>
        <button
          type="button"
          disabled={!hasSelection || actionsDisabled}
          onClick={onHide}
          className={cn(
            ACTION_CHIP,
            "border-primary/30 bg-[#0A0A0A]/90 text-zinc-100 hover:border-primary/45 hover:bg-black/85",
          )}
        >
          <ListX className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>{t("p5.chat.inbox.action_hide")}</span>
        </button>
        <button
          type="button"
          disabled={!hasSelection || actionsDisabled}
          onClick={onDelete}
          className={cn(
            ACTION_CHIP,
            "border-red-500/35 bg-red-950/25 text-red-100 hover:border-red-500/50 hover:bg-red-950/40",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          <span>{t("p5.chat.inbox.action_delete")}</span>
        </button>
      </div>
    </header>
  );
}

import { X } from "lucide-react";
import { t } from "@/i18n";
import { CHAT_THREAD_HEADER_BAR } from "@/lib/chat-thread-header-styles";
import { cn } from "@/lib/utils";

type ChatThreadSelectionHeaderProps = {
  dirRtl: boolean;
  selectedCount: number;
  totalCount: number;
  busy: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
};

export function ChatThreadSelectionHeader({
  dirRtl,
  selectedCount,
  totalCount,
  busy,
  onCancel,
  onSelectAll,
}: ChatThreadSelectionHeaderProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <header
      className={cn(CHAT_THREAD_HEADER_BAR, "z-40")}
      dir={dirRtl ? "rtl" : "ltr"}
      role="toolbar"
      aria-label={t("message_thread.select_count", { count: selectedCount })}
    >
      <div className="mx-auto flex min-h-[56px] w-full max-w-[820px] items-center gap-2 px-2 py-1 sm:px-3 md:px-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-9 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-2 text-[12px] font-semibold text-zinc-200 transition-colors hover:border-primary/45 hover:bg-black/80"
        >
          <X className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("message_thread.select_cancel")}</span>
        </button>

        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tabular-nums text-white">
          {t("message_thread.select_count", { count: selectedCount })}
        </p>

        <button
          type="button"
          onClick={onSelectAll}
          disabled={busy || totalCount === 0 || allSelected}
          className="inline-flex h-9 min-w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-2 text-[12px] font-semibold text-primary shadow-[0_0_14px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/55 hover:bg-primary/16 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t("message_thread.select_all")}
        </button>
      </div>
    </header>
  );
}

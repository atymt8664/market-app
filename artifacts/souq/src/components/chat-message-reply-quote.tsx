import { CornerUpLeft } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export type MessageReplyQuoteData = {
  sourceMessageId: number;
  authorLabel: string;
  preview: string;
};

type ChatMessageReplyQuoteProps = {
  quote: MessageReplyQuoteData;
  dirRtl: boolean;
  onNavigate: () => void;
};

export function ChatMessageReplyQuote({
  quote,
  dirRtl,
  onNavigate,
}: ChatMessageReplyQuoteProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onNavigate();
      }}
      className={cn(
        "mb-1.5 flex w-full min-w-0 items-stretch gap-1.5 rounded-md border border-primary/22 bg-black/30 px-2 py-1 text-start transition-colors hover:border-primary/38 hover:bg-primary/5 active:bg-primary/10",
        dirRtl && "text-right",
      )}
      aria-label={t("message_thread.reply_go_to_source")}
    >
      <div
        className="w-0.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.4)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-primary">
          <CornerUpLeft className="h-2.5 w-2.5 shrink-0" aria-hidden />
          <span className="truncate">{quote.authorLabel}</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-zinc-400">{quote.preview}</p>
      </div>
    </button>
  );
}

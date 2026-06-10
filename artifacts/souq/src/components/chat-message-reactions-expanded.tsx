import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  CHAT_EMOJI_CATEGORIES,
  filterEmojiCategories,
  type EmojiCategoryId,
} from "@/lib/chat-emoji-picker-data";

const PANEL_SHELL =
  "flex max-h-[min(62dvh,480px)] flex-col rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] shadow-[0_-16px_48px_-16px_rgba(0,0,0,0.65)] ring-1 ring-primary/20";

type ChatMessageReactionsExpandedProps = {
  open: boolean;
  dirRtl: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
  /** Reaction bar needs a dismiss guard; composer must dismiss immediately on mobile. */
  variant?: "reaction" | "composer";
};

export function ChatMessageReactionsExpanded({
  open,
  dirRtl,
  onPick,
  onClose,
  variant = "reaction",
}: ChatMessageReactionsExpandedProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>("smileys");
  const [dismissReady, setDismissReady] = useState(false);
  const [backdropActive, setBackdropActive] = useState(false);
  const isComposer = variant === "composer";

  useEffect(() => {
    if (!open) {
      setDismissReady(false);
      setBackdropActive(false);
      return;
    }
    if (isComposer) {
      setDismissReady(true);
      const frame = window.requestAnimationFrame(() => setBackdropActive(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setDismissReady(true), 280);
    return () => window.clearTimeout(timer);
  }, [open, isComposer]);

  useEffect(() => {
    if (!open || !isComposer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isComposer, onClose]);

  const categories = useMemo(
    () => (query.trim() ? filterEmojiCategories(query) : CHAT_EMOJI_CATEGORIES),
    [query],
  );

  const visibleCategory = useMemo(() => {
    if (query.trim()) return categories[0] ?? CHAT_EMOJI_CATEGORIES[0]!;
    return categories.find((c) => c.id === activeCategory) ?? categories[0]!;
  }, [categories, activeCategory, query]);

  if (!open || typeof document === "undefined") return null;

  const pick = (emoji: string) => {
    onPick(emoji);
    onClose();
    setQuery("");
  };

  return createPortal(
    <>
      <button
        type="button"
        className={cn(
          "fixed inset-0 z-[74] cursor-default touch-manipulation",
          isComposer ? "bg-black/25" : "bg-black/40",
        )}
        aria-label={t("message_thread.select_cancel")}
        style={isComposer && !backdropActive ? { pointerEvents: "none" } : undefined}
        onPointerDown={(e) => {
          if (isComposer) return;
          if (!dismissReady) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onClick={() => {
          if (isComposer || dismissReady) onClose();
        }}
      />
      <div
        className={cn(PANEL_SHELL, "fixed inset-x-0 bottom-0 z-[75]")}
        role="dialog"
        aria-label={
          isComposer ? t("message_thread.composer_emoji") : t("message_thread.reactions_more")
        }
        onClick={(e) => e.stopPropagation()}
        dir={dirRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600" aria-hidden />

        <div className="flex shrink-0 items-center gap-2 border-b border-primary/15 px-3 py-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500",
                dirRtl ? "right-2.5" : "left-2.5",
              )}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("message_thread.emoji_search")}
              className={cn(
                "w-full rounded-full border border-primary/25 bg-[#111] py-1.5 text-[13px] text-white outline-none placeholder:text-zinc-500 focus:border-primary/45",
                dirRtl ? "pr-8 pl-3 text-right" : "pl-8 pr-3 text-left",
              )}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("message_thread.select_cancel")}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/35 text-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <p className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-zinc-400">
          {query.trim()
            ? t("message_thread.emoji_search_results")
            : t(visibleCategory.labelKey)}
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-1">
          <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-9">
            {visibleCategory.emojis.map((emoji) => (
              <button
                key={`${visibleCategory.id}-${emoji}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(emoji);
                }}
                className="inline-flex aspect-square w-full items-center justify-center rounded-lg text-[26px] leading-none touch-manipulation hover:bg-primary/10 active:scale-90 active:bg-primary/20 [-webkit-tap-highlight-color:transparent]"
                aria-label={emoji}
              >
                <span
                  aria-hidden
                  className="select-none [font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif]"
                >
                  {emoji}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!query.trim() ? (
          <div
            className={cn(
              "flex shrink-0 gap-0.5 overflow-x-auto border-t border-primary/15 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              dirRtl && "flex-row-reverse",
            )}
          >
            {CHAT_EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "inline-flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg text-[18px] transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary/15 text-white ring-1 ring-primary/35"
                    : "text-zinc-400 hover:bg-zinc-900",
                )}
                aria-label={t(cat.labelKey)}
                aria-pressed={activeCategory === cat.id}
              >
                {cat.tabIcon}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}

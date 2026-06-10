import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getListConversationsQueryKey,
  sendMessage,
  useListConversations,
  type ConversationListItem,
  type Message,
} from "@workspace/api-client-react";
import { Check, Search, Send, X } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  filterForwardableMessages,
  resolveForwardCapability,
} from "@/lib/chat-forward-message";

const PANEL_SHELL =
  "flex max-h-[min(72dvh,560px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

type ChatForwardPickerSheetProps = {
  open: boolean;
  dirRtl: boolean;
  currentConvId: number;
  messages: Message[];
  onOpenChange: (open: boolean) => void;
  onDone?: (result: { sent: number; failed: number }) => void;
};

export function ChatForwardPickerSheet({
  open,
  dirRtl,
  currentConvId,
  messages,
  onOpenChange,
  onDone,
}: ChatForwardPickerSheetProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const forwardable = useMemo(() => filterForwardableMessages(messages), [messages]);

  const { data: conversations, isPending } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: open,
    },
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(conversations) ? conversations : [];
    return list.filter((c) => {
      if (c.id === currentConvId) return false;
      if (!q) return true;
      return (
        c.otherName.toLowerCase().includes(q) ||
        c.adTitle.toLowerCase().includes(q)
      );
    });
  }, [conversations, currentConvId, query]);

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setQuery("");
    setSelected(new Set());
    onOpenChange(false);
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!selected.size || !forwardable.length || busy) return;
    setBusy(true);
    let sent = 0;
    let failed = 0;

    for (const convId of selected) {
      for (const msg of forwardable) {
        const cap = resolveForwardCapability(msg);
        if (cap.kind !== "send") {
          failed += 1;
          continue;
        }
        try {
          await sendMessage(convId, cap.payload);
          sent += 1;
        } catch {
          failed += 1;
        }
      }
    }

    setBusy(false);
    onDone?.({ sent, failed });
    close();
  };

  const panel = (
    <div
      className={cn(PANEL_SHELL, "fixed inset-x-0 bottom-0 z-[75]")}
      role="dialog"
      aria-modal="false"
      aria-label={t("message_thread.forward_picker_title")}
      onClick={(e) => e.stopPropagation()}
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/20 px-3 py-2.5">
        <h2 className="m-0 flex-1 text-start text-xs font-semibold text-white">
          {t("message_thread.forward_picker_title")}
        </h2>
        <button
          type="button"
          aria-label={t("message_thread.select_cancel")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary"
          onClick={close}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="px-3 pt-2">
        <label className="relative block">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary",
              dirRtl ? "right-2.5" : "left-2.5",
            )}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("message_thread.forward_picker_search")}
            className={cn(
              "w-full rounded-xl border border-primary/30 bg-[#0A0A0A] py-2 text-[13px] text-white outline-none ring-primary/20 placeholder:text-zinc-500 focus:border-primary/50 focus:ring-1",
              dirRtl ? "pr-8 pl-3 text-right" : "pl-8 pr-3 text-left",
            )}
          />
        </label>
        <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">
          {t("message_thread.forward_limits_note")}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isPending ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            {t("message_thread.forward_picker_loading")}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            {t("message_thread.forward_picker_empty")}
          </p>
        ) : (
          rows.map((c) => (
            <ForwardRow
              key={c.id}
              conversation={c}
              dirRtl={dirRtl}
              selected={selected.has(c.id)}
              disabled={busy}
              onToggle={() => toggle(c.id)}
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-primary/20 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={busy || selected.size === 0 || forwardable.length === 0}
          onClick={() => void handleSend()}
          className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/15 text-sm font-semibold text-primary transition-colors hover:bg-primary/22 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
          {t("message_thread.forward_picker_send", { count: selected.size })}
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : null;
}

function ForwardRow({
  conversation: c,
  dirRtl,
  selected,
  disabled,
  onToggle,
}: {
  conversation: ConversationListItem;
  dirRtl: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "mb-1 flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-start transition-colors",
        selected
          ? "border-primary/50 bg-primary/10"
          : "border-primary/25 bg-[#0A0A0A]/80 hover:border-primary/40",
      )}
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected
            ? "border-primary bg-primary/20 text-primary"
            : "border-zinc-600 bg-transparent text-transparent",
        )}
        aria-hidden
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-[#0A0A0A]">
        {c.adImage ? (
          <img src={c.adImage} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{c.otherName}</p>
        <p className="truncate text-[11px] text-zinc-400">{c.adTitle}</p>
      </div>
    </button>
  );
}

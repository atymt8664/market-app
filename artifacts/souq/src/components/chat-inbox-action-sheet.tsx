import {
  BellOff,
  BellRing,
  CheckSquare,
  ListX,
  Pin,
  PinOff,
  Trash2,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg";

const ACTION_BTN =
  "flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-4 py-3.5 text-start shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-colors hover:border-primary/48 hover:bg-black/92 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

const ACTION_ICON =
  "h-4 w-4 shrink-0 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.22)] opacity-95";

type ChatInboxActionSheetProps = {
  open: boolean;
  peerName: string;
  isPinned: boolean;
  isMuted: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onPin: () => void;
  onMute: () => void;
  onHide: () => void;
  onDelete: () => void;
  onEnterSelection: () => void;
};

export function ChatInboxActionSheet({
  open,
  peerName,
  isPinned,
  isMuted,
  busy,
  onOpenChange,
  onPin,
  onMute,
  onHide,
  onDelete,
  onEnterSelection,
}: ChatInboxActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideClose className={SHEET_SHELL}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4" dir="rtl">
          <SheetTitle className="m-0 min-w-0 flex-1 truncate text-right text-base font-semibold text-white">
            {peerName || t("messages.user")}
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label={t("messages.hidden_close")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{t("p5.chat.inbox.action_sheet_title")}</SheetDescription>
        <div
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          dir="rtl"
        >
          <button type="button" disabled={busy} className={ACTION_BTN} onClick={onPin}>
            {isPinned ? (
              <PinOff className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            ) : (
              <Pin className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            )}
            <span className="flex-1 text-sm font-semibold text-white">
              {isPinned ? t("p5.chat.inbox.action_unpin") : t("p5.chat.inbox.action_pin")}
            </span>
          </button>
          <button type="button" disabled={busy} className={ACTION_BTN} onClick={onMute}>
            {isMuted ? (
              <BellRing className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            ) : (
              <BellOff className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            )}
            <span className="flex-1 text-sm font-semibold text-white">
              {isMuted ? t("p5.chat.inbox.action_unmute") : t("p5.chat.inbox.action_mute")}
            </span>
          </button>
          <button type="button" disabled={busy} className={ACTION_BTN} onClick={onHide}>
            <ListX className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            <span className="flex-1 text-sm font-semibold text-white">
              {t("p5.chat.inbox.action_hide")}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            className={cn(ACTION_BTN, "border-red-500/35 bg-red-950/20 hover:border-red-500/50")}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 shrink-0 text-red-300" strokeWidth={2.25} aria-hidden />
            <span className="flex-1 text-sm font-semibold text-red-100">
              {t("p5.chat.inbox.action_delete")}
            </span>
          </button>
          <button type="button" disabled={busy} className={ACTION_BTN} onClick={onEnterSelection}>
            <CheckSquare className={ACTION_ICON} strokeWidth={2.25} aria-hidden />
            <span className="flex-1 text-sm font-semibold text-white">
              {t("p5.chat.inbox.action_select")}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useRef } from "react";
import { INBOX_UNDO_SNACKBAR_BOTTOM_CLASS } from "@/lib/bottom-nav-layout";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const UNDO_DURATION_MS = 5000;

const SNACKBAR_SHELL =
  "mx-auto flex w-full max-w-[min(100%,20rem)] items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-[#0A0A0A]/95 px-4 py-3 text-foreground shadow-[0_0_32px_-10px_hsl(var(--primary)/0.32)] ring-1 ring-primary/18 backdrop-blur-sm sm:max-w-sm";

const UNDO_BTN =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-primary/55 hover:bg-primary/18 active:scale-[0.98]";

type ChatInboxDeleteUndoSnackbarProps = {
  open: boolean;
  onUndo: () => void;
  onExpire: () => void;
};

/** Bottom snackbar for single-conversation delete undo — above BottomNav, RTL action on the right. */
export function ChatInboxDeleteUndoSnackbar({
  open,
  onUndo,
  onExpire,
}: ChatInboxDeleteUndoSnackbarProps) {
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => expireRef.current(), UNDO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[45] flex justify-center px-4",
        INBOX_UNDO_SNACKBAR_BOTTOM_CLASS,
      )}
      role="status"
      aria-live="polite"
    >
      <div dir="rtl" className={cn(SNACKBAR_SHELL, "pointer-events-auto")}>
        <button type="button" className={UNDO_BTN} onClick={onUndo}>
          {t("p5.chat.inbox.delete_undo_label")}
        </button>
        <span className="min-w-0 flex-1 text-end text-sm font-semibold leading-snug text-foreground">
          {t("p5.chat.inbox.delete_success_one")}
        </span>
      </div>
    </div>
  );
}

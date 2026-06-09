import { X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg";

type ChatInboxConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function ChatInboxConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy,
  destructive,
  onConfirm,
  onOpenChange,
}: ChatInboxConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" hideClose className={SHEET_SHELL}>
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-5 pb-3 pt-5"
          dir="rtl"
        >
          <SheetTitle className="m-0 min-w-0 flex-1 text-right text-lg font-bold text-white">
            {title}
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              disabled={busy}
              aria-label={cancelLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30 disabled:opacity-45"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5"
          dir="rtl"
        >
          <p className="text-right text-[15px] leading-relaxed text-zinc-400">{description}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={cn(
                "inline-flex h-14 w-full items-center justify-center rounded-2xl border px-5 text-base font-bold shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 transition-colors active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45",
                destructive
                  ? "border-red-500/50 bg-red-950/35 text-red-50 ring-red-500/25 hover:border-red-500/65 hover:bg-red-950/50"
                  : "border-primary/50 bg-primary/18 text-primary ring-primary/20 hover:border-primary/65 hover:bg-primary/25",
              )}
            >
              {busy ? "…" : confirmLabel}
            </button>
            <SheetClose asChild>
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/90 px-5 text-base font-semibold text-foreground shadow-[0_0_16px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10 transition-colors hover:border-primary/50 hover:bg-black/40 active:scale-[0.99] disabled:opacity-45"
              >
                {cancelLabel}
              </button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

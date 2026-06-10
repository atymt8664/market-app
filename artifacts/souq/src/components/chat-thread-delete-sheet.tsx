import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";

const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

const SHEET_CLOSE_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30";

const OPTION_BTN =
  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-start shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-colors active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

const ALERT_SURFACE =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

type PendingDelete = "me" | "everyone" | null;

type ChatThreadDeleteSheetProps = {
  open: boolean;
  dirRtl: boolean;
  selectedCount: number;
  canDeleteForEveryone: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDeleteForMe: () => void;
  onConfirmDeleteForEveryone: () => void;
};

export function ChatThreadDeleteSheet({
  open,
  dirRtl,
  selectedCount,
  canDeleteForEveryone,
  busy,
  onOpenChange,
  onConfirmDeleteForMe,
  onConfirmDeleteForEveryone,
}: ChatThreadDeleteSheetProps) {
  const [pending, setPending] = useState<PendingDelete>(null);

  const closeAll = () => {
    setPending(null);
    onOpenChange(false);
  };

  const confirmDelete = () => {
    if (pending === "me") onConfirmDeleteForMe();
    else if (pending === "everyone") onConfirmDeleteForEveryone();
    setPending(null);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet
        open={open && pending === null}
        onOpenChange={(next) => {
          if (!next) closeAll();
          else onOpenChange(next);
        }}
      >
        <SheetContent side="bottom" hideClose className={SHEET_SHELL}>
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4"
            dir={dirRtl ? "rtl" : "ltr"}
          >
            <SheetTitle className="m-0 flex-1 text-start text-base font-semibold text-white">
              {t("message_thread.select_delete_sheet_title")}
            </SheetTitle>
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t("message_thread.select_cancel")}
                className={SHEET_CLOSE_BTN}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            {t("message_thread.select_delete_sheet_title")}
          </SheetDescription>
          <div
            className="flex flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            dir={dirRtl ? "rtl" : "ltr"}
          >
            <button
              type="button"
              disabled={busy || selectedCount === 0}
              onClick={() => setPending("me")}
              className={cn(
                OPTION_BTN,
                "border-red-500/35 bg-red-950/25 text-red-100 hover:border-red-500/50 hover:bg-red-950/40",
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 text-sm font-semibold">
                {t("message_thread.select_delete_for_me")}
              </span>
            </button>

            {canDeleteForEveryone ? (
              <button
                type="button"
                disabled={busy || selectedCount === 0}
                onClick={() => setPending("everyone")}
                className={cn(
                  OPTION_BTN,
                  "border-amber-500/35 bg-amber-950/20 text-amber-50 hover:border-amber-500/50 hover:bg-amber-950/35",
                )}
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 text-sm font-semibold">
                  {t("message_thread.select_delete_for_everyone")}
                </span>
              </button>
            ) : (
              <p className="rounded-xl border border-zinc-800/80 bg-[#0A0A0A]/80 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500">
                {t("message_thread.select_delete_for_everyone_unavailable")}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={closeAll}
              className={cn(
                OPTION_BTN,
                "border-primary/25 bg-[#0A0A0A]/90 text-zinc-300 hover:border-primary/40 hover:bg-black/85",
              )}
            >
              <span className="flex-1 text-center text-sm font-semibold">
                {t("message_thread.select_cancel")}
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
      >
        <AlertDialogContent className={ALERT_SURFACE} dir={dirRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-white">
              {pending === "everyone"
                ? t("message_thread.select_delete_confirm_everyone_title")
                : t("message_thread.select_delete_confirm_me_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pending === "everyone"
                ? t("message_thread.select_delete_confirm_everyone_desc", {
                    count: selectedCount,
                  })
                : t("message_thread.select_delete_confirm_me_desc", {
                    count: selectedCount,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              disabled={busy}
              className="rounded-xl border border-primary/30 bg-[#0A0A0A] text-zinc-200 hover:bg-black/80"
            >
              {t("message_thread.select_cancel")}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={busy}
              onClick={confirmDelete}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-500/45 bg-red-950/40 px-4 text-sm font-semibold text-red-100 transition-colors hover:bg-red-950/55"
            >
              {t("message_thread.select_delete_confirm_cta")}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

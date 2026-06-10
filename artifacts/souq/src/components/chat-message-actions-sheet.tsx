import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Message } from "@workspace/api-client-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Copy,
  CornerUpLeft,
  Forward,
  Trash2,
  X,
} from "lucide-react";

const SHEET_SHELL =
  "flex w-full flex-col gap-0 rounded-t-xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-8px_28px_-12px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

const ACTION_BTN =
  "inline-flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-0.5 py-1.5 text-[10px] font-semibold leading-tight transition-[border-color,background-color,transform] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const ALERT_SURFACE =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

type PendingDelete = "me" | "everyone" | null;

type FocusActionsSheetProps = {
  mode: "focus";
  open: boolean;
  dirRtl: boolean;
  message: Message;
  mine: boolean;
  canCopy: boolean;
  canForward: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onSelectAll: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
};

type MultiActionsSheetProps = {
  mode: "multi";
  open: boolean;
  dirRtl: boolean;
  selectedCount: number;
  canReply: boolean;
  canCopy: boolean;
  canForward: boolean;
  canDeleteForEveryone: boolean;
  busy: boolean;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
};

export type ChatMessageActionsSheetProps = FocusActionsSheetProps | MultiActionsSheetProps;

const FOCUS_ITEMS = [
  { key: "reply", icon: CornerUpLeft, labelKey: "message_thread.select_reply", variant: "primary" as const },
  { key: "forward", icon: Forward, labelKey: "message_thread.select_forward", variant: "default" as const },
  { key: "copy", icon: Copy, labelKey: "message_thread.select_copy", variant: "default" as const },
  { key: "delete_me", icon: Trash2, labelKey: "message_thread.select_delete_for_me", variant: "danger" as const },
  { key: "delete_everyone", icon: Trash2, labelKey: "message_thread.select_delete_for_everyone", variant: "warn" as const },
  { key: "select_all", icon: CheckSquare, labelKey: "message_thread.select_all", variant: "default" as const },
] as const;

const MULTI_ITEMS = [
  { key: "reply", icon: CornerUpLeft, labelKey: "message_thread.select_reply", variant: "primary" as const },
  { key: "forward", icon: Forward, labelKey: "message_thread.select_forward", variant: "default" as const },
  { key: "copy", icon: Copy, labelKey: "message_thread.select_copy", variant: "default" as const },
  { key: "delete_me", icon: Trash2, labelKey: "message_thread.select_delete_for_me", variant: "danger" as const },
  { key: "delete_everyone", icon: Trash2, labelKey: "message_thread.select_delete_for_everyone", variant: "warn" as const },
] as const;

export function ChatMessageActionsSheet(props: ChatMessageActionsSheetProps) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const isFocus = props.mode === "focus";
  const open = props.open;
  const dirRtl = props.dirRtl;
  const busy = props.busy;

  const visibleItems = useMemo(() => {
    if (isFocus) {
      return FOCUS_ITEMS.filter((item) => item.key !== "delete_everyone" || props.mine);
    }
    return MULTI_ITEMS.filter(
      (item) => item.key !== "delete_everyone" || props.canDeleteForEveryone,
    );
  }, [isFocus, props]);

  if (!open) return null;
  if (isFocus && !props.message) return null;

  const closeAll = () => {
    setPendingDelete(null);
    if (isFocus) props.onOpenChange(false);
  };

  const confirmDelete = () => {
    if (pendingDelete === "me") props.onDeleteForMe();
    else if (pendingDelete === "everyone") props.onDeleteForEveryone();
    setPendingDelete(null);
    if (isFocus) props.onOpenChange(false);
  };

  const deleteCount = isFocus ? 1 : props.selectedCount;

  const panel =
    pendingDelete === null ? (
      <div
        className={cn(SHEET_SHELL, "fixed inset-x-0 bottom-0 z-[60]")}
        role="dialog"
        aria-modal="false"
        aria-label={t("message_thread.focus_actions_title")}
        onClick={(e) => e.stopPropagation()}
      >
        {isFocus ? (
          <div
            className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/15 px-2.5 py-1.5"
            dir={dirRtl ? "rtl" : "ltr"}
          >
            <h2 className="m-0 flex-1 text-start text-[11px] font-semibold text-white">
              {t("message_thread.focus_actions_title")}
            </h2>
            <button
              type="button"
              aria-label={t("message_thread.select_cancel")}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary"
              onClick={closeAll}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            "grid w-full gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5",
            visibleItems.length === 6 ? "grid-cols-6" : "grid-cols-5",
          )}
          dir={dirRtl ? "rtl" : "ltr"}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            let disabled = busy;

            if (item.key === "copy") {
              disabled = disabled || !(isFocus ? props.canCopy : props.canCopy);
            } else if (item.key === "forward") {
              disabled = disabled || !(isFocus ? props.canForward : props.canForward);
            } else if (item.key === "reply" && !isFocus) {
              disabled = disabled || !props.canReply;
            }

            const onClick = () => {
              if (item.key === "reply") {
                props.onReply();
                if (isFocus) closeAll();
              } else if (item.key === "forward") {
                props.onForward();
                if (isFocus) closeAll();
              } else if (item.key === "copy") {
                props.onCopy();
                if (isFocus) closeAll();
              } else if (item.key === "delete_me") {
                setPendingDelete("me");
              } else if (item.key === "delete_everyone") {
                setPendingDelete("everyone");
              } else if (item.key === "select_all" && isFocus) {
                props.onSelectAll();
                closeAll();
              }
            };

            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={onClick}
                className={cn(
                  ACTION_BTN,
                  item.variant === "primary" &&
                    "border-primary/35 bg-primary/10 text-primary hover:border-primary/50",
                  item.variant === "default" &&
                    "border-primary/30 bg-[#0A0A0A] text-white hover:border-primary/45",
                  item.variant === "danger" &&
                    "border-red-500/35 bg-red-950/25 text-red-100 hover:border-red-500/50",
                  item.variant === "warn" &&
                    "border-amber-500/35 bg-amber-950/20 text-amber-50 hover:border-amber-500/50",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="w-full px-0.5 text-center leading-[1.15] [overflow-wrap:anywhere]">
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className={ALERT_SURFACE} dir={dirRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-white">
              {pendingDelete === "everyone"
                ? t("message_thread.select_delete_confirm_everyone_title")
                : t("message_thread.select_delete_confirm_me_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingDelete === "everyone"
                ? t("message_thread.select_delete_confirm_everyone_desc", { count: deleteCount })
                : t("message_thread.select_delete_confirm_me_desc", { count: deleteCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              disabled={busy}
              className="rounded-xl border border-primary/30 bg-[#0A0A0A] text-zinc-200"
            >
              {t("message_thread.select_cancel")}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={busy}
              onClick={confirmDelete}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-500/45 bg-red-950/40 px-4 text-sm font-semibold text-red-100"
            >
              {t("message_thread.select_delete_confirm_cta")}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

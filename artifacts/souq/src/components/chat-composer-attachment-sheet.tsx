import { Camera, FileText, ImageIcon, Paperclip } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CHAT_COMPOSER_INLINE_BTN } from "@/lib/chat-composer-styles";

export type ChatAttachmentKind = "camera" | "gallery" | "file";

type ChatComposerAttachmentSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirRtl: boolean;
  disabled?: boolean;
  onSelect: (kind: ChatAttachmentKind) => void;
};

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-[#0A0A0A]/85 px-4 py-3.5 text-right shadow-[0_0_16px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 transition-[border-color,background-color,transform] duration-200 hover:border-primary/45 hover:bg-black/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

const ICON_WRAP =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.28)]";

const OPTIONS: Array<{
  kind: ChatAttachmentKind;
  icon: typeof Camera;
  labelKey: string;
}> = [
  { kind: "camera", icon: Camera, labelKey: "message_thread.attach_camera" },
  { kind: "gallery", icon: ImageIcon, labelKey: "message_thread.attach_gallery" },
  { kind: "file", icon: FileText, labelKey: "message_thread.attach_file" },
];

export function ChatComposerAttachmentSheet({
  open,
  onOpenChange,
  dirRtl,
  disabled,
  onSelect,
}: ChatComposerAttachmentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex max-h-[min(85dvh,520px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4"
          dir={dirRtl ? "rtl" : "ltr"}
        >
          <SheetTitle className="m-0 flex-1 text-center text-base font-semibold text-white">
            {t("message_thread.attach_sheet_title")}
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label={t("message_thread.attach_sheet_close")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30"
            >
              ✕
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">
          {t("message_thread.attach_sheet_title")}
        </SheetDescription>
        <div
          className="flex flex-col gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          dir={dirRtl ? "rtl" : "ltr"}
        >
          {OPTIONS.map(({ kind, icon: Icon, labelKey }) => (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              data-testid={kind === "camera" ? "chat-attach-camera" : kind === "gallery" ? "chat-attach-gallery" : kind === "file" ? "chat-attach-file" : undefined}
              onClick={() => {
                onSelect(kind);
                onOpenChange(false);
              }}
              className={ROW_CLASS}
            >
              <span className={ICON_WRAP} aria-hidden>
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Inline attachment trigger (inside composer field). */
export function ChatComposerAttachButton({
  disabled,
  onClick,
  dirRtl,
}: {
  disabled?: boolean;
  onClick: () => void;
  dirRtl: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={CHAT_COMPOSER_INLINE_BTN}
      aria-label={t("message_thread.attach_open")}
      data-testid="chat-composer-attach-btn"
    >
      <Paperclip className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}

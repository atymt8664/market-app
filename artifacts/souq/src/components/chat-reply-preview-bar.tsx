import type { Message } from "@workspace/api-client-react";

import { CornerUpLeft, X } from "lucide-react";

import { getChatMessageCopyText } from "@/lib/chat-message-copy";

import { t } from "@/i18n";

import { cn } from "@/lib/utils";



type ChatReplyPreviewBarProps = {

  message: Message;

  peerName?: string;

  currentUserId?: number;

  dirRtl: boolean;

  onCancel: () => void;

  onNavigateToSource?: () => void;

};



export function ChatReplyPreviewBar({

  message,

  peerName,

  currentUserId,

  dirRtl,

  onCancel,

  onNavigateToSource,

}: ChatReplyPreviewBarProps) {

  const preview =

    getChatMessageCopyText(message) ??

    (message.messageType === "image"

      ? t("message_thread.reply_preview_image")

      : t("message_thread.reply_preview_empty"));



  return (

    <div

      className="flex items-stretch gap-2 rounded-xl border border-primary/30 bg-[#0A0A0A]/95 px-2.5 py-2 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12"

      dir={dirRtl ? "rtl" : "ltr"}

      role="status"

    >

      <div

        className="w-1 shrink-0 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.45)]"

        aria-hidden

      />

      <button

        type="button"

        onClick={onNavigateToSource}

        disabled={!onNavigateToSource}

        className={cn(

          "min-w-0 flex-1 text-start transition-colors",

          onNavigateToSource && "cursor-pointer rounded-lg hover:bg-primary/5 active:bg-primary/10",

        )}

        aria-label={t("message_thread.reply_go_to_source")}

      >

        <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-primary">

          <CornerUpLeft className="h-3 w-3 shrink-0" aria-hidden />

          <span className="truncate">

            {t("message_thread.reply_preview_label", {
              name:
                message.senderId === currentUserId
                  ? t("message_thread.reply_preview_self")
                  : peerName?.trim() || t("messages.user"),
            })}

          </span>

        </div>

        <p className={cn("line-clamp-2 text-[12px] leading-snug text-zinc-300", dirRtl && "text-right")}>

          {preview}

        </p>

      </button>

      <button

        type="button"

        onClick={onCancel}

        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] text-primary hover:bg-black/40"

        aria-label={t("message_thread.reply_cancel")}

      >

        <X className="h-4 w-4" aria-hidden />

      </button>

    </div>

  );

}



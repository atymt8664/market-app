import { Smile } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CHAT_COMPOSER_INLINE_BTN } from "@/lib/chat-composer-styles";
import { ChatMessageReactionsExpanded } from "@/components/chat-message-reactions-expanded";

type ChatComposerEmojiButtonProps = {
  dirRtl: boolean;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (emoji: string) => void;
};

export function ChatComposerEmojiButton({
  dirRtl,
  disabled,
  open,
  onOpenChange,
  onPick,
}: ChatComposerEmojiButtonProps) {
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={cn(CHAT_COMPOSER_INLINE_BTN, open && "bg-primary/12")}
        aria-label={t("message_thread.composer_emoji")}
        aria-expanded={open}
        data-testid="chat-composer-emoji-btn"
      >
        <Smile className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </button>
      <ChatMessageReactionsExpanded
        variant="composer"
        open={open}
        dirRtl={dirRtl}
        onPick={onPick}
        onClose={() => onOpenChange(false)}
      />
    </>
  );
}

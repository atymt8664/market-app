import { Link } from "wouter";
import type { ConversationDetail, UserPresenceEntry } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { ChatThreadOverflowMenu } from "@/components/chat-thread-overflow-menu";
import { ChatThreadPresenceLine } from "@/components/chat-thread-presence-line";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  CHAT_THREAD_BACK_BTN,
  CHAT_THREAD_HEADER_AVATAR,
  CHAT_THREAD_HEADER_BAR,
  CHAT_THREAD_HEADER_INNER,
} from "@/lib/chat-thread-header-styles";
import { platformHeaderDomProps } from "@/lib/platform-header-safe-area";

const CHAT_TIP_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] text-[12px] leading-relaxed text-zinc-200 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12";

function ThreadHeaderAvatar({
  name,
  src,
  "data-testid": dataTestId,
}: {
  name: string;
  src?: string | null;
  "data-testid"?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
        sizes="40px"
        data-testid={dataTestId}
        data-avatar-kind="image"
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[#0A0A0A] text-[15px] font-bold text-primary"
      data-testid={dataTestId}
      data-avatar-kind="initial"
    >
      {initial || "?"}
    </div>
  );
}

type ChatThreadHeaderProps = {
  conv: ConversationDetail | undefined;
  dirRtl: boolean;
  showPeerTyping: boolean;
  peerPresenceEntry: UserPresenceEntry | undefined;
  peerPresenceLoading: boolean;
  menuTipSeen: boolean;
  onDismissMenuTip: () => void;
  onBack: () => void;
};

export function ChatThreadHeader({
  conv,
  dirRtl,
  showPeerTyping,
  peerPresenceEntry,
  peerPresenceLoading,
  menuTipSeen,
  onDismissMenuTip,
  onBack,
}: ChatThreadHeaderProps) {
  const typingLabel = t("message_thread.typing").replace(/^●\s*/, "");

  return (
    <header
      className={CHAT_THREAD_HEADER_BAR}
      dir={dirRtl ? "rtl" : "ltr"}
      data-chat-thread-header="1"
      {...platformHeaderDomProps()}
    >
      <div className={CHAT_THREAD_HEADER_INNER}>
        <button
          type="button"
          onClick={onBack}
          className={CHAT_THREAD_BACK_BTN}
          aria-label={t("message_thread.back_to_inbox")}
        >
          {dirRtl ? (
            <ArrowRight className="h-4 w-4" aria-hidden />
          ) : (
            <ArrowLeft className="h-4 w-4" aria-hidden />
          )}
        </button>

        {conv ? (
          <Link
            href={`/users/${conv.otherId}`}
            className={cn(CHAT_THREAD_HEADER_AVATAR, "transition-opacity hover:opacity-90")}
            aria-label={conv.otherName}
          >
            <ThreadHeaderAvatar
              name={conv.otherName}
              src={conv.otherAvatarUrl}
              data-testid="thread-peer-avatar"
            />
          </Link>
        ) : (
          <div className={CHAT_THREAD_HEADER_AVATAR} aria-hidden />
        )}

        <div className="flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="truncate text-[15px] font-semibold leading-[1.2] text-white">
            {conv?.otherName || "..."}
          </div>
          {conv ? (
            <ChatThreadPresenceLine
              entry={peerPresenceEntry}
              isLoading={peerPresenceLoading}
              showTyping={showPeerTyping}
              typingLabel={typingLabel}
            />
          ) : null}
        </div>

        {conv ? (
          <div className="relative shrink-0 self-center">
            {!menuTipSeen ? (
              <aside
                className="absolute -bottom-[4.55rem] end-0 z-30 w-[min(18.5rem,74vw)]"
                dir={dirRtl ? "rtl" : "ltr"}
              >
                <div className={`${CHAT_TIP_CARD} p-2.5`}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-primary">⋮</span>
                    <button
                      type="button"
                      onClick={onDismissMenuTip}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] text-primary hover:bg-black/30"
                      aria-label={t("message_thread.tip_close")}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </div>
                  <p className="text-[11px] leading-snug text-zinc-300">
                    {t("message_thread.tip_menu")}
                  </p>
                </div>
              </aside>
            ) : null}
            <ChatThreadOverflowMenu
              conversationId={conv.id}
              otherUserId={conv.otherId}
              adId={conv.adId}
              adAvailable={conv.adAvailable !== false}
              dirRtl={dirRtl}
              compact
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

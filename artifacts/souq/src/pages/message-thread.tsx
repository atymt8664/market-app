import { Redirect, useLocation, useParams, useSearch } from "wouter";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useHideMessagesForMe,
  getAuthProfileCsrfTokenForRequest,
  getListConversationsQueryKey,
  invalidateUserPresenceBatchQueries,
  useUserPresenceBatch,
  type Message as ChatMessage,
  type QuotedMessage,
  ApiError,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ban,
  Check,
  CheckCheck,
  CornerUpLeft,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { useChatThreadViewportResize } from "@/hooks/use-chat-thread-viewport-resize";
import {
  applyIncomingMessageToInboxCache,
  clearConversationUnreadInInboxCache,
} from "@/lib/inbox-conversation-cache";
import { deleteMessagesForEveryone } from "@/lib/chat-delete-for-everyone";
import { setMessageReaction } from "@/lib/chat-message-reaction";
import {
  getChatMessageCopyText,
  selectionHasCopyableMessages,
} from "@/lib/chat-message-copy";
import { copyTextToClipboard } from "@/lib/copy-text";
import { isMessageDeletedForEveryone } from "@/lib/chat-message-deleted";
import { ChatThreadDeleteSheet } from "@/components/chat-thread-delete-sheet";
import { ChatThreadSelectionHeader } from "@/components/chat-thread-selection-header";
import {
  ChatMessageReactionsBar,
  type MessageAnchorRect,
} from "@/components/chat-message-reactions-bar";
import { ChatMessageActionsSheet } from "@/components/chat-message-actions-sheet";
import { ChatMessageFocusBackdrop } from "@/components/chat-message-focus-backdrop";
import { ChatMessageFocusErrorBoundary } from "@/components/chat-message-focus-error-boundary";
import { ChatForwardPickerSheet } from "@/components/chat-forward-picker-sheet";
import { ChatReplyPreviewBar } from "@/components/chat-reply-preview-bar";
import {
  ChatMessageReplyQuote,
  type MessageReplyQuoteData,
} from "@/components/chat-message-reply-quote";
import {
  filterForwardableMessages,
  resolveForwardCapability,
} from "@/lib/chat-forward-message";
import {
  chatBubbleImageClass,
  chatBubbleTextClass,
  chatBubbleTimestampClass,
  CHAT_RECV_BUBBLE_SHELL,
  CHAT_QUICK_REPLY_CHIP,
  CHAT_QUICK_REPLY_ROW,
  CHAT_SENT_BUBBLE_SHELL,
} from "@/lib/chat-message-bubble-styles";
import {
  blockChatNativeMenu,
  chatBlockNativeMenuDivProps,
  CHAT_MESSAGE_BUBBLE_TOUCH,
  CHAT_MESSAGE_TOUCH_GUARD,
} from "@/lib/chat-message-touch-guard";
import {
  ChatComposerAttachButton,
  ChatComposerAttachmentSheet,
  type ChatAttachmentKind,
} from "@/components/chat-composer-attachment-sheet";
import { ChatComposerEmojiButton } from "@/components/chat-composer-emoji-button";
import { CHAT_COMPOSER_FIELD_SHELL, CHAT_COMPOSER_TEXTAREA } from "@/lib/chat-composer-styles";
import { ChatLocationMessageCard } from "@/components/chat-location-message-card";
import {
  CHAT_LOCATION_MESSAGE_TYPE,
  parseChatLocationBody,
} from "@/lib/chat-location-message";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { formatMessageTimestamp } from "@/lib/format";
import { userSafeToastDescription } from "@/lib/user-api-errors";
import { cn } from "@/lib/utils";
import {
  GC_THREAD_MESSAGES_MS,
  STALE_PEER_BLOCK_MS,
  STALE_THREAD_MESSAGES_MS,
} from "@/lib/query-stale-times";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { ChatThreadHeader } from "@/components/chat-thread-header";
import { ChatConversationAdsBar } from "@/components/chat-conversation-ads-bar";
import { ChatAdReferenceMessageContent } from "@/components/chat-ad-reference-message-content";
import {
  CHAT_AD_REFERENCE_MESSAGE_TYPE,
  parseChatAdReferenceBody,
} from "@/lib/chat-ad-reference-message";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CHAT_MENU_TIP_SEEN_KEY,
  MESSAGE_SELECTION_TIP_SEEN_KEY,
  QUICK_REPLIES_TIP_SEEN_KEY,
  readSeenFlag,
  setSeenFlag,
} from "@/lib/chat-tips-seen";
import { OrderChatContextBanner } from "@/features/p17-commerce/order-chat-context-banner";
import {
  getBuyerOrderDetailPath,
  getSellerOrderDetailPath,
} from "@/features/p17-commerce/order-detail-paths";
import { isCanonicalOrderNumber } from "@/features/p17-commerce/order-detail-display";

/** بطاقات تلميحات أول مرة فقط — لا تُستخدم على فقاعات الرسائل. */
const CHAT_TIP_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] text-[12px] leading-relaxed text-zinc-200 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12";

/** مطابقة نافذة إلغاء الحظر في قائمة الشات */
const INLINE_UNBLOCK_ALERT_SURFACE =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

const BUYER_QUICK_KEYS = [
  "message_thread.msg_qs_buyer_1",
  "message_thread.msg_qs_buyer_2",
  "message_thread.msg_qs_buyer_3",
  "message_thread.msg_qs_buyer_4",
  "message_thread.msg_qs_buyer_5",
  "message_thread.msg_qs_buyer_6",
] as const;

const SELLER_QUICK_KEYS = [
  "message_thread.msg_qs_seller_1",
  "message_thread.msg_qs_seller_2",
  "message_thread.msg_qs_seller_3",
  "message_thread.msg_qs_seller_4",
  "message_thread.msg_qs_seller_5",
  "message_thread.msg_qs_seller_6",
] as const;

/** نفس ترتيب `.sort` السابق: createdAt تصاعديًا، ثم id عند التعادل. */
function compareMessagesByCreatedAtThenId(a: ChatMessage, b: ChatMessage): number {
  const ta = new Date(a.createdAt).getTime();
  const tb = new Date(b.createdAt).getTime();
  if (ta !== tb) return ta - tb;
  return a.id - b.id;
}

/** إدراج رسالة في قائمة مرتبة مسبقًا — O(log n) بدل sort كامل. */
function insertMessageSorted(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareMessagesByCreatedAtThenId(list[mid]!, incoming) < 0) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return [...list.slice(0, lo), incoming, ...list.slice(lo)];
}

function toQuotedMessageFromChat(m: ChatMessage): QuotedMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    messageType: m.messageType,
    imageUrl: m.imageUrl ?? null,
    deletedForEveryoneAt: m.deletedForEveryoneAt ?? null,
  };
}

/** Ensure POST/WS payloads show reply quote immediately in thread UI. */
function enrichSentMessageWithReply(
  newMsg: ChatMessage,
  replyingTo: ChatMessage | null,
): ChatMessage {
  if (!replyingTo) return newMsg;
  if (newMsg.quotedMessage) return newMsg;
  return {
    ...newMsg,
    replyToMessageId: newMsg.replyToMessageId ?? replyingTo.id,
    quotedMessage: toQuotedMessageFromChat(replyingTo),
  };
}

/** دمج رسالة واردة في القائمة دون إعادة ترتيب كامل عند الإدراج في النهاية. */
function mergeMessagesIntoList(
  prev: ChatMessage[] | undefined,
  incoming: ChatMessage,
): ChatMessage[] {
  const list = prev ?? [];
  const idx = list.findIndex((m) => m.id === incoming.id);
  if (idx >= 0) {
    const next = [...list];
    const prevRow = next[idx]!;
    const merged: ChatMessage = { ...prevRow, ...incoming };
    if (!incoming.quotedMessage && prevRow.quotedMessage) {
      merged.quotedMessage = prevRow.quotedMessage;
    }
    if (incoming.replyToMessageId == null && prevRow.replyToMessageId != null) {
      merged.replyToMessageId = prevRow.replyToMessageId;
    }
    next[idx] = merged;
    return next;
  }
  if (list.length === 0) {
    return [incoming];
  }
  const last = list[list.length - 1]!;
  if (compareMessagesByCreatedAtThenId(last, incoming) <= 0) {
    return [...list, incoming];
  }
  const first = list[0]!;
  if (compareMessagesByCreatedAtThenId(incoming, first) < 0) {
    return [incoming, ...list];
  }
  return insertMessageSorted(list, incoming);
}

/** http(s) and in-app ad paths — safe split; text nodes rendered by React (escaped). */
const LINK_SPLIT_RE = /https?:\/\/[^\s<>"']+|\/ad\/\d+\b/gi;

function splitMessageSegments(text: string): Array<{ kind: "text" | "link"; value: string }> {
  const re = new RegExp(LINK_SPLIT_RE.source, LINK_SPLIT_RE.flags);
  const out: Array<{ kind: "text" | "link"; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", value: text.slice(last, m.index) });
    }
    out.push({ kind: "link", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "text", value: text.slice(last) });
  }
  if (out.length === 0) {
    out.push({ kind: "text", value: text });
  }
  return out;
}

function renderMessageRichText(
  raw: string,
  dirRtl: boolean,
  isCompact = false,
  mine = false,
): ReactNode {
  const text = raw || "";
  const segments = splitMessageSegments(text);
  const hasLink = segments.some((s) => s.kind === "link");
  const textClass = cn(chatBubbleTextClass(mine, isCompact), CHAT_MESSAGE_TOUCH_GUARD);
  const linkClass = cn(
    "break-all font-medium text-primary underline decoration-primary/45 underline-offset-[3px] [overflow-wrap:anywhere]",
    CHAT_MESSAGE_TOUCH_GUARD,
  );
  if (!hasLink) {
    return (
      <span
        dir={dirRtl ? "rtl" : "ltr"}
        onContextMenu={blockChatNativeMenu}
        className={cn("block break-words", textClass)}
      >
        {text}
      </span>
    );
  }
  return (
    <div
      dir={dirRtl ? "rtl" : "ltr"}
      onContextMenu={blockChatNativeMenu}
      className={textClass}
    >
      {segments.map((seg, idx) =>
        seg.kind === "text" ? (
          <span key={`t-${idx}`}>{seg.value}</span>
        ) : (
          <a
            key={`l-${idx}`}
            href={seg.value}
            target="_blank"
            rel="noopener noreferrer"
            onContextMenu={blockChatNativeMenu}
            className={linkClass}
            dir={seg.value.startsWith("http") ? "ltr" : undefined}
          >
            {seg.value}
          </a>
        ),
      )}
    </div>
  );
}

function renderBubbleDeliveryIcon(m: ChatMessage): ReactNode {
  const iconClass = "h-2.5 w-2.5 shrink-0 stroke-[2.25]";
  if (m.readAt) {
    return (
      <CheckCheck
        className={`${iconClass} text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.38)]`}
        aria-hidden
      />
    );
  }
  if (m.deliveredAt) {
    return (
      <CheckCheck
        className={`${iconClass} text-muted-foreground/85`}
        aria-hidden
      />
    );
  }
  return <Check className={`${iconClass} text-muted-foreground/70`} aria-hidden />;
}

type MessageBubbleLocale = "ar" | "de" | "en";

/** WhatsApp-like: clear drag distance before reply commits on release. */
const CHAT_SWIPE_REPLY_THRESHOLD_PX = 88;
const CHAT_SWIPE_REPLY_MAX_OFFSET_RATIO = 0.42;
const CHAT_SWIPE_REPLY_AXIS_LOCK_PX = 14;
const CHAT_SWIPE_REPLY_AXIS_RATIO = 1.45;

function getSwipeReplyMaxOffsetPx(): number {
  if (typeof window === "undefined") return 168;
  return Math.round(window.innerWidth * CHAT_SWIPE_REPLY_MAX_OFFSET_RATIO);
}

type SwipeTrackState = {
  startX: number;
  startY: number;
  active: boolean;
  axis: "undecided" | "horizontal" | "vertical";
  pointerId: number;
  fired: boolean;
};

type ChatMessageBubbleRowProps = {
  m: ChatMessage;
  mine: boolean;
  selectMode: boolean;
  /** Single-message focus: show selection circles on all rows without multi-select header. */
  showFocusSelectChrome: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isHighlighted: boolean;
  myReaction: string | null;
  replyQuote: MessageReplyQuoteData | null;
  interactionLocked: boolean;
  dirRtl: boolean;
  locale: MessageBubbleLocale;
  onRowPointerDown: (m: ChatMessage, e: PointerEvent, bubbleEl: HTMLElement) => void;
  onRowPointerEnd: () => void;
  onRowTapWhileFocus: (m: ChatMessage) => void;
  onRowClick: (m: ChatMessage, e: MouseEvent) => void;
  onRowKeyDown: (m: ChatMessage, e: KeyboardEvent) => void;
  onSwipeReply: (m: ChatMessage) => void;
  onReplyQuoteNavigate: (sourceMessageId: number) => void;
};

function chatMessageBubbleRowPropsAreEqual(
  a: ChatMessageBubbleRowProps,
  b: ChatMessageBubbleRowProps,
): boolean {
  return (
    a.m === b.m &&
    a.mine === b.mine &&
    a.selectMode === b.selectMode &&
    a.showFocusSelectChrome === b.showFocusSelectChrome &&
    a.isSelected === b.isSelected &&
    a.isFocused === b.isFocused &&
    a.isHighlighted === b.isHighlighted &&
    a.myReaction === b.myReaction &&
    a.replyQuote === b.replyQuote &&
    a.interactionLocked === b.interactionLocked &&
    a.dirRtl === b.dirRtl &&
    a.locale === b.locale
  );
}

const ChatMessageBubbleRow = memo(function ChatMessageBubbleRow({
  m,
  mine,
  selectMode,
  showFocusSelectChrome,
  isSelected,
  isFocused,
  isHighlighted,
  myReaction,
  replyQuote,
  interactionLocked,
  dirRtl,
  locale,
  onRowPointerDown,
  onRowPointerEnd,
  onRowTapWhileFocus,
  onRowClick,
  onRowKeyDown,
  onSwipeReply,
  onReplyQuoteNavigate,
}: ChatMessageBubbleRowProps) {
  const swipeTrackRef = useRef<SwipeTrackState | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDragging, setSwipeDragging] = useState(false);

  const releaseSwipePointer = (pointerId: number) => {
    const el = bubbleRef.current;
    if (el?.hasPointerCapture(pointerId)) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const resetSwipeTrack = (pointerId?: number) => {
    if (pointerId != null) releaseSwipePointer(pointerId);
    swipeTrackRef.current = null;
    setSwipeOffset(0);
    setSwipeDragging(false);
  };
  const deletedForEveryone = isMessageDeletedForEveryone(m);
  const plain = m.body ?? "";
  const isImageMsg = m.messageType === "image" && Boolean(m.imageUrl);
  const locationPayload = parseChatLocationBody(plain, m.messageType);
  const isLocationMsg =
    String(m.messageType) === CHAT_LOCATION_MESSAGE_TYPE && locationPayload != null;
  const adReferencePayload = parseChatAdReferenceBody(plain, m.messageType);
  const isAdReferenceMsg =
    String(m.messageType) === CHAT_AD_REFERENCE_MESSAGE_TYPE && adReferencePayload != null;
  const showText =
    !deletedForEveryone && !isLocationMsg && !isAdReferenceMsg && plain.trim().length > 0;
  const showBubbleContent =
    deletedForEveryone || isImageMsg || isLocationMsg || isAdReferenceMsg || showText;
  const deletedLabel = deletedForEveryone
    ? mine
      ? t("message_thread.deleted_for_everyone_by_me")
      : t("message_thread.deleted_for_everyone_by_peer")
    : null;
  const showSelectChrome = selectMode || showFocusSelectChrome;
  const isCompactText =
    showText &&
    !replyQuote &&
    !isImageMsg &&
    !isLocationMsg &&
    !isAdReferenceMsg &&
    plain.length <= 72 &&
    !plain.includes("\n");
  const swipePastThreshold = Math.abs(swipeOffset) >= CHAT_SWIPE_REPLY_THRESHOLD_PX;
  return (
    <div
      className={cn(
        "flex w-fit min-w-0 max-w-[min(100%,85%)] items-end gap-2 sm:max-w-[80%] md:max-w-[72%]",
        mine ? "ml-auto flex-row-reverse" : "mr-auto flex-row",
      )}
    >
      {showSelectChrome ? (
        <span
          className={cn(
            "mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isSelected
              ? "border-primary bg-primary/25 text-primary shadow-[0_0_14px_-4px_hsl(var(--primary)/0.55)]"
              : "border-zinc-500/90 bg-[#0A0A0A] text-transparent",
          )}
          aria-hidden
        >
          <Check className={cn("h-3.5 w-3.5 stroke-[3]", isSelected ? "opacity-100" : "opacity-0")} />
        </span>
      ) : null}
      <div className="relative">
      <div
        ref={bubbleRef}
        role="button"
        tabIndex={0}
        data-message-id={m.id}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const el = e.currentTarget as HTMLElement;
          swipeTrackRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            active: true,
            axis: "undecided",
            pointerId: e.pointerId,
            fired: false,
          };
          onRowPointerDown(m, e, el);
          if (showSelectChrome || interactionLocked) return;
        }}
        onPointerMove={(e) => {
          const track = swipeTrackRef.current;
          if (!track?.active || track.pointerId !== e.pointerId) return;
          if (showSelectChrome || interactionLocked) return;

          const dx = e.clientX - track.startX;
          const dy = e.clientY - track.startY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (track.axis === "undecided") {
            if (absDx < CHAT_SWIPE_REPLY_AXIS_LOCK_PX && absDy < CHAT_SWIPE_REPLY_AXIS_LOCK_PX) {
              return;
            }
            if (absDy > absDx * CHAT_SWIPE_REPLY_AXIS_RATIO) {
              track.axis = "vertical";
              track.active = false;
              resetSwipeTrack(track.pointerId);
              onRowPointerEnd();
              return;
            }
            if (absDx > absDy * CHAT_SWIPE_REPLY_AXIS_RATIO) {
              track.axis = "horizontal";
              onRowPointerEnd();
              const el = bubbleRef.current;
              if (el) {
                try {
                  el.setPointerCapture(e.pointerId);
                } catch {
                  /* unsupported */
                }
              }
            } else {
              return;
            }
          }

          if (track.axis !== "horizontal" || track.fired) return;

          e.preventDefault();
          setSwipeDragging(true);

          const naturalSwipe = mine ? dx < 0 : dx > 0;
          if (!naturalSwipe) {
            setSwipeOffset(0);
            return;
          }
          const clamped = Math.min(absDx, getSwipeReplyMaxOffsetPx());
          setSwipeOffset(dx > 0 ? clamped : -clamped);
        }}
        onPointerUp={(e) => {
          const track = swipeTrackRef.current;
          const pointerId = track?.pointerId ?? e.pointerId;
          if (interactionLocked && track?.active && track.axis === "undecided") {
            const dx = e.clientX - track.startX;
            const dy = e.clientY - track.startY;
            if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
              onRowTapWhileFocus(m);
            }
          }
          if (
            track?.axis === "horizontal" &&
            !track.fired &&
            !showSelectChrome &&
            !interactionLocked
          ) {
            const dx = e.clientX - track.startX;
            const absDx = Math.abs(dx);
            const naturalSwipe = mine ? dx < 0 : dx > 0;
            if (naturalSwipe && absDx >= CHAT_SWIPE_REPLY_THRESHOLD_PX) {
              track.fired = true;
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate(10);
                } catch {
                  /* optional haptic */
                }
              }
              onSwipeReply(m);
            }
          }
          resetSwipeTrack(pointerId);
          onRowPointerEnd();
        }}
        onPointerCancel={(e) => {
          resetSwipeTrack(swipeTrackRef.current?.pointerId ?? e.pointerId);
          onRowPointerEnd();
        }}
        onClick={(e) => onRowClick(m, e)}
        onKeyDown={(e) => onRowKeyDown(m, e)}
        {...chatBlockNativeMenuDivProps}
        style={
          swipeOffset !== 0 || swipeDragging
            ? {
                transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
                transition: swipeDragging ? "none" : "transform 180ms ease-out",
              }
            : undefined
        }
        className={cn(
          "min-w-0 max-w-[min(78vw,280px)] sm:max-w-[min(72vw,300px)] md:max-w-[min(68vw,320px)]",
          CHAT_MESSAGE_BUBBLE_TOUCH,
          showSelectChrome ? "cursor-pointer" : "cursor-default",
          mine ? CHAT_SENT_BUBBLE_SHELL : CHAT_RECV_BUBBLE_SHELL,
          isFocused &&
            "relative z-[58] ring-2 ring-primary shadow-[0_0_44px_-6px_hsl(var(--primary)/0.72)]",
          isSelected &&
            showFocusSelectChrome &&
            "relative z-[58] ring-2 ring-primary shadow-[0_0_44px_-6px_hsl(var(--primary)/0.72)]",
          isHighlighted && "relative z-[58] ring-2 ring-primary/80 shadow-[0_0_40px_-6px_hsl(var(--primary)/0.65)]",
        )}
      >
        {swipeOffset !== 0 ? (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 z-[1] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-150",
              swipePastThreshold
                ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_14px_-4px_hsl(var(--primary)/0.45)]"
                : "border-primary/20 bg-black/40 text-zinc-500",
              mine
                ? dirRtl
                  ? "right-full mr-2"
                  : "left-full ml-2"
                : dirRtl
                  ? "left-full ml-2"
                  : "right-full mr-2",
            )}
            style={{
              opacity: Math.min(1, Math.abs(swipeOffset) / CHAT_SWIPE_REPLY_THRESHOLD_PX),
            }}
            aria-hidden
          >
            <CornerUpLeft className="h-4 w-4" />
          </span>
        ) : null}
        <div
          className={cn(
            "relative z-[2]",
            isCompactText ? "px-2.5 pb-1 pt-1.5" : "px-3 pb-2 pt-2 md:px-3.5 md:pb-2.5 md:pt-2.5",
            showSelectChrome && "pointer-events-none",
          )}
        >
          {deletedForEveryone && deletedLabel ? (
            <div
              className={cn(
                "flex min-w-0 items-center gap-2 text-sm italic text-zinc-400",
                dirRtl ? "flex-row-reverse text-right" : "text-left",
              )}
            >
              <Ban
                className="h-4 w-4 shrink-0 text-zinc-500"
                aria-hidden
              />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {deletedLabel}
              </span>
            </div>
          ) : !showBubbleContent ? (
            <span className="text-sm text-zinc-400" aria-hidden>
              —
            </span>
          ) : (
            <div className={cn("flex flex-col", isCompactText ? "gap-1" : "gap-1.5")}>
              {replyQuote ? (
                <ChatMessageReplyQuote
                  quote={replyQuote}
                  dirRtl={dirRtl}
                  onNavigate={() => onReplyQuoteNavigate(replyQuote.sourceMessageId)}
                />
              ) : null}
              {isLocationMsg && locationPayload ? (
                <ChatLocationMessageCard
                  location={locationPayload}
                  mine={mine}
                  dirRtl={dirRtl}
                />
              ) : null}
              {isAdReferenceMsg && adReferencePayload ? (
                <ChatAdReferenceMessageContent
                  payload={adReferencePayload}
                  dirRtl={dirRtl}
                  mine={mine}
                />
              ) : null}
              {isImageMsg && m.imageUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    if (selectMode) return;
                    e.stopPropagation();
                    window.open(m.imageUrl!, "_blank", "noopener,noreferrer");
                  }}
                  onContextMenu={blockChatNativeMenu}
                  className="block w-full shrink-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <img
                    src={m.imageUrl}
                    alt=""
                    draggable={false}
                    onContextMenu={blockChatNativeMenu}
                    className={cn(chatBubbleImageClass(mine), CHAT_MESSAGE_TOUCH_GUARD)}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) min(100vw - 3rem, 280px), 300px"
                  />
                </button>
              ) : null}
              {showText ? renderMessageRichText(plain, dirRtl, isCompactText, mine) : null}
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-0.5",
              isCompactText ? "mt-0.5" : "mt-1",
              mine ? "justify-end" : "justify-start",
            )}
            dir="ltr"
          >
            <time dateTime={m.createdAt} className={chatBubbleTimestampClass(mine)}>
              {formatMessageTimestamp(m.createdAt, locale)}
            </time>
            {mine && (
              <span
                className="inline-flex translate-y-[0.5px] items-center"
                aria-hidden
              >
                {renderBubbleDeliveryIcon(m)}
              </span>
            )}
          </div>
        </div>
      </div>
      {myReaction ? (
        <span
          className={cn(
            "pointer-events-none absolute -bottom-2 z-[4] inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] px-1 text-[14px] leading-none shadow-[0_2px_10px_-4px_rgba(0,0,0,0.7)] ring-1 ring-primary/20",
            mine
              ? dirRtl
                ? "left-0"
                : "right-0"
              : dirRtl
                ? "right-0"
                : "left-0",
          )}
          aria-label={myReaction}
        >
          <span aria-hidden className="[font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif]">
            {myReaction}
          </span>
        </span>
      ) : null}
      </div>
    </div>
  );
}, chatMessageBubbleRowPropsAreEqual);

async function postChatImageUpload(convId: number, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const csrf = getAuthProfileCsrfTokenForRequest();
  const uploadHeaders =
    typeof csrf === "string" && csrf.length >= 32 ? { "X-CSRF-Token": csrf } : undefined;
  const res = await fetch(apiUrl(`/api/conversations/${convId}/messages/upload-image`), {
    method: "POST",
    body: fd,
    credentials: "include",
    headers: uploadHeaders,
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!data || typeof data !== "object" || !("imageUrl" in data)) {
    throw new Error("Invalid upload response");
  }
  const url = (data as { imageUrl: unknown }).imageUrl;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Invalid upload response");
  }
  return url.trim();
}

function messageDraftStorageKey(convId: number) {
  return `souq:message-draft:${convId}`;
}

/** Merge wouter search with window.location so ?draft survives router edge cases in production. */
function resolveSearchString(wouterSearch: string): string {
  if (wouterSearch && wouterSearch.length > 0) {
    return wouterSearch.startsWith("?") ? wouterSearch : `?${wouterSearch}`;
  }
  if (typeof window !== "undefined" && window.location.search) {
    return window.location.search;
  }
  return "";
}

export default function MessageThread() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const search = useSearch();
  const orderReturnNumber = useMemo(() => {
    const p = new URLSearchParams(search);
    if (p.get("from") !== "order") return null;
    const num = p.get("orderNumber")?.trim() ?? "";
    return isCanonicalOrderNumber(num) ? num : null;
  }, [search]);
  const orderReturnRole = useMemo(() => {
    const p = new URLSearchParams(search);
    return p.get("orderRole") === "seller" ? "seller" : "buyer";
  }, [search]);
  const { locale } = useLocale();
  const rawConvParam = params.id;
  const conversationId =
    rawConvParam != null && rawConvParam !== ""
      ? Number(rawConvParam)
      : Number.NaN;
  const conversationOk =
    Number.isFinite(conversationId) && conversationId > 0;
  /** استخدم للاستعلام فقط بعد التحقق — يمنع مفاتيح خاطئة ومزامنة pending الخاطئة */
  const convIdForQuery = conversationOk ? conversationId : 0;

  const queryClient = useQueryClient();
  const send = useSendMessage();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileAttachInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const scrollAnchorConvRef = useRef<number | null>(null);
  const rowPointerDownRef = useRef<
    (m: ChatMessage, e: PointerEvent, bubbleEl: HTMLElement) => void
  >(() => {});
  const rowPointerEndRef = useRef<() => void>(() => {});
  const rowClickRef = useRef<(m: ChatMessage, e: MouseEvent) => void>(() => {});
  const rowKeyDownRef = useRef<(m: ChatMessage, e: KeyboardEvent) => void>(() => {});
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveSentRef = useRef(false);
  const typingStartDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRenewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otherUserIdRef = useRef<number | undefined>(undefined);
  const [peerTyping, setPeerTyping] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [messageFocus, setMessageFocus] = useState<{
    message: ChatMessage;
    anchor: MessageAnchorRect;
  } | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const lpTimerRef = useRef<number | null>(null);
  const longPressConsumedRef = useRef(false);
  const messageFocusHistoryPushedRef = useRef(false);
  const messageFocusClosingViaPopRef = useRef(false);
  const rowSwipeReplyRef = useRef<(m: ChatMessage) => void>(() => {});
  const rowTapWhileFocusRef = useRef<(m: ChatMessage) => void>(() => {});
  const hideMessagesForMe = useHideMessagesForMe();
  const [menuTipSeen, setMenuTipSeen] = useState<boolean>(() =>
    readSeenFlag(CHAT_MENU_TIP_SEEN_KEY),
  );
  const [selectionTipSeen, setSelectionTipSeen] = useState<boolean>(() =>
    readSeenFlag(MESSAGE_SELECTION_TIP_SEEN_KEY),
  );
  const [quickTipSeen, setQuickTipSeen] = useState<boolean>(() =>
    readSeenFlag(QUICK_REPLIES_TIP_SEEN_KEY),
  );
  const [inlineUnblockConfirmOpen, setInlineUnblockConfirmOpen] = useState(false);
  const [inlineUnblockPending, setInlineUnblockPending] = useState(false);
  const [selectionActionBusy, setSelectionActionBusy] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [forwardMessages, setForwardMessages] = useState<ChatMessage[]>([]);
  const [forwardPickerOpen, setForwardPickerOpen] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const composerSendingRef = useRef(false);

  useChatThreadViewportResize(conversationOk);

  useAutoResizeTextarea(composerTextareaRef, body, { minPx: 22, maxPx: 104 });

  useEffect(() => {
    if (!composerFocused) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [composerFocused]);

  const insertComposerEmoji = useCallback((emoji: string) => {
    setBody((prev) => `${prev}${emoji}`);
    setComposerEmojiOpen(false);
    requestAnimationFrame(() => composerTextareaRef.current?.focus());
  }, []);

  const pendingImagePreviewUrl = useMemo(() => {
    if (!pendingImageFile) return null;
    return URL.createObjectURL(pendingImageFile);
  }, [pendingImageFile]);

  useEffect(() => {
    return () => {
      if (pendingImagePreviewUrl) URL.revokeObjectURL(pendingImagePreviewUrl);
    };
  }, [pendingImagePreviewUrl]);

  const messagesQueryEnabled = !!user && conversationOk;

  const { data: conv } = useGetConversation(convIdForQuery, {
    query: {
      queryKey: getGetConversationQueryKey(convIdForQuery),
      enabled: messagesQueryEnabled,
    },
  });
  const {
    data: messagesRaw,
    isPending,
    isError,
    refetch,
  } = useListMessages(convIdForQuery, {
    query: {
      queryKey: getListMessagesQueryKey(convIdForQuery),
      enabled: messagesQueryEnabled,
      staleTime: STALE_THREAD_MESSAGES_MS,
      gcTime: GC_THREAD_MESSAGES_MS,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  });

  /** يضمن عدم اعتبار الاستجابة غير المصفوفية «لا رسائل» بدل كشف الخطأ */
  const messages = useMemo((): ChatMessage[] | undefined => {
    if (messagesRaw == null) return undefined;
    if (Array.isArray(messagesRaw)) {
      return messagesRaw as ChatMessage[];
    }
    return [];
  }, [messagesRaw]);

  const messageReactions = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of messages ?? []) {
      const reaction = m.myReaction;
      if (typeof reaction === "string" && reaction.length > 0) {
        map[m.id] = reaction;
      }
    }
    return map;
  }, [messages]);

  const patchMessageReactionInCache = useCallback(
    (messageId: number, myReaction: string | null) => {
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) =>
          (old ?? []).map((m) =>
            m.id === messageId ? { ...m, myReaction } : m,
          ),
      );
    },
    [queryClient, convIdForQuery],
  );

  /** Secondary thread queries run only after the messages request has settled (success or error). */
  const secondaryQueriesReady =
    messagesQueryEnabled && !isPending && (messagesRaw !== undefined || isError);

  otherUserIdRef.current = conv?.otherId;

  const peerIdForBlock = conv?.otherId;
  const peerBlockQueryKey = ["userBlockStatus", peerIdForBlock ?? 0, user?.id ?? 0] as const;
  const peerBlockQueryEnabled =
    secondaryQueriesReady &&
    Boolean(user) &&
    typeof peerIdForBlock === "number" &&
    peerIdForBlock > 0 &&
    user != null &&
    peerIdForBlock !== user.id;

  const {
    data: peerBlockStatus,
    isPending: peerBlockPending,
    isError: peerBlockQueryError,
  } = useQuery({
    queryKey: peerBlockQueryKey,
    enabled: peerBlockQueryEnabled,
    staleTime: STALE_PEER_BLOCK_MS,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/users/${peerIdForBlock}/block-status`), {
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `HTTP ${res.status}`);
      }
      return (await res.json()) as { blockedByMe: boolean; blocksMe?: boolean };
    },
  });

  const peerPresenceTargets = useMemo(
    () => (typeof conv?.otherId === "number" && conv.otherId > 0 ? [conv.otherId] : []),
    [conv?.otherId],
  );
  const peerPresenceEnabled =
    Boolean(user) &&
    messagesQueryEnabled &&
    peerPresenceTargets.length > 0 &&
    Boolean(conv?.otherId);

  const peerPresenceQ = useUserPresenceBatch(peerPresenceTargets, {
    enabled: peerPresenceEnabled,
  });
  const peerPresenceEntry = peerPresenceQ.data?.byUserId[String(conv?.otherId ?? "")];

  useEffect(() => {
    if (!peerPresenceEnabled || !conv?.otherId) return;
    void invalidateUserPresenceBatchQueries(queryClient, [conv.otherId]);
  }, [conv?.otherId, peerPresenceEnabled, queryClient]);

  const chatPeerMessagingDisabled =
    Boolean(peerBlockStatus?.blockedByMe) || Boolean(peerBlockStatus?.blocksMe);
  const composerLocked =
    peerBlockQueryEnabled && (peerBlockPending || chatPeerMessagingDisabled);

  const performInlineUnblock = useCallback(async () => {
    setInlineUnblockConfirmOpen(false);
    if (!user || peerIdForBlock == null || !Number.isFinite(peerIdForBlock)) return;
    setInlineUnblockPending(true);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      const csrf = getAuthProfileCsrfTokenForRequest();
      if (typeof csrf === "string" && csrf.length >= 32) {
        headers["X-CSRF-Token"] = csrf;
      }
      const res = await fetch(apiUrl(`/api/users/${peerIdForBlock}/block`), {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      if (res.ok) {
        toast({ title: t("message_thread.chat_unblock_success") });
        queryClient.setQueryData<{ blockedByMe: boolean; blocksMe?: boolean }>(
          peerBlockQueryKey,
          (old) => ({
            blockedByMe: false,
            blocksMe: Boolean(old?.blocksMe),
          }),
        );
        await queryClient.invalidateQueries({ queryKey: peerBlockQueryKey });
        await invalidateUserPresenceBatchQueries(queryClient, [peerIdForBlock]);
        return;
      }
    } catch {
      /* network */
    } finally {
      setInlineUnblockPending(false);
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
      variant: "destructive",
    });
  }, [user, peerIdForBlock, peerBlockQueryKey, queryClient, toast, t]);

  const removeMessagesFromCache = useCallback(
    (ids: number[]) => {
      if (!ids.length) return;
      const idSet = new Set(ids);
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) => (old ?? []).filter((m) => !idSet.has(m.id)),
      );
    },
    [queryClient, convIdForQuery],
  );

  const markMessagesDeletedForEveryoneInCache = useCallback(
    (ids: number[], deletedAt: string) => {
      if (!ids.length || !deletedAt) return;
      const idSet = new Set(ids);
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) =>
          (old ?? []).map((m) =>
            idSet.has(m.id) ? { ...m, deletedForEveryoneAt: deletedAt } : m,
          ),
      );
    },
    [queryClient, convIdForQuery],
  );

  const { send: wsSend } = useChatSocket((ev) => {
    if (!conversationOk) return;
    if (ev.type === "messages_removed" && ev.conversationId === conversationId) {
      if (ev.deletedForEveryoneAt) {
        markMessagesDeletedForEveryoneInCache(ev.messageIds, ev.deletedForEveryoneAt);
      } else {
        removeMessagesFromCache(ev.messageIds);
      }
      return;
    }
    if (ev.type === "message" && ev.conversationId === conversationId) {
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) => mergeMessagesIntoList(old, ev.message as ChatMessage),
      );
      if (user?.id) {
        applyIncomingMessageToInboxCache(queryClient, {
          myUserId: user.id,
          conversationId: ev.conversationId,
          message: ev.message,
        });
      }
      if (
        otherUserIdRef.current != null &&
        ev.message.senderId === otherUserIdRef.current
      ) {
        setPeerTyping(false);
        if (typingHideRef.current) {
          clearTimeout(typingHideRef.current);
          typingHideRef.current = null;
        }
      }
      return;
    }
    if (
      ev.type === "typing" &&
      ev.conversationId === conversationId &&
      otherUserIdRef.current != null &&
      ev.userId === otherUserIdRef.current
    ) {
      if (ev.active) {
        setPeerTyping(true);
        if (typingHideRef.current) clearTimeout(typingHideRef.current);
        typingHideRef.current = setTimeout(() => {
          setPeerTyping(false);
          typingHideRef.current = null;
        }, 5000);
      } else {
        setPeerTyping(false);
        if (typingHideRef.current) {
          clearTimeout(typingHideRef.current);
          typingHideRef.current = null;
        }
      }
    }
  });

  const flushTypingToPeer = useCallback(() => {
    if (typingStartDebounceRef.current) {
      clearTimeout(typingStartDebounceRef.current);
      typingStartDebounceRef.current = null;
    }
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    if (typingRenewRef.current) {
      clearInterval(typingRenewRef.current);
      typingRenewRef.current = null;
    }
    if (!typingActiveSentRef.current) return;
    if (conversationOk && user) {
      wsSend({ type: "typing:stop", conversationId });
    }
    typingActiveSentRef.current = false;
  }, [conversationId, conversationOk, user, wsSend]);

  useEffect(() => {
    if (!conversationOk || !user) return;
    if (composerLocked) {
      flushTypingToPeer();
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) {
      flushTypingToPeer();
      return;
    }
    if (typingStartDebounceRef.current) {
      clearTimeout(typingStartDebounceRef.current);
      typingStartDebounceRef.current = null;
    }
    typingStartDebounceRef.current = setTimeout(() => {
      typingStartDebounceRef.current = null;
      if (!conversationOk || !user || composerLocked) return;
      if (!body.trim()) return;
      if (!typingActiveSentRef.current) {
        wsSend({ type: "typing:start", conversationId });
        typingActiveSentRef.current = true;
        if (!typingRenewRef.current) {
          typingRenewRef.current = setInterval(() => {
            if (!typingActiveSentRef.current) return;
            wsSend({ type: "typing:start", conversationId });
          }, 2200);
        }
      }
    }, 350);
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      typingIdleRef.current = null;
      flushTypingToPeer();
    }, 1800);
    return () => {
      if (typingStartDebounceRef.current) {
        clearTimeout(typingStartDebounceRef.current);
        typingStartDebounceRef.current = null;
      }
      if (typingIdleRef.current) {
        clearTimeout(typingIdleRef.current);
        typingIdleRef.current = null;
      }
    };
  }, [body, composerLocked, conversationId, conversationOk, user, wsSend, flushTypingToPeer]);

  useEffect(() => {
    if (chatPeerMessagingDisabled) setPeerTyping(false);
  }, [chatPeerMessagingDisabled]);

  useEffect(() => {
    if (!user || !conversationOk) return;
    wsSend({
      type: "conversation:focus",
      conversationId: conversationId,
      active: true,
    });
    return () => {
      flushTypingToPeer();
      wsSend({
        type: "conversation:focus",
        conversationId: conversationId,
        active: false,
      });
    };
  }, [conversationId, conversationOk, user?.id, wsSend, flushTypingToPeer]);

  useEffect(() => {
    setPeerTyping(false);
    if (typingHideRef.current) {
      clearTimeout(typingHideRef.current);
      typingHideRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setMessageFocus(null);
    setReplyToMessage(null);
  }, [conversationId]);

  const clearLongPressTimer = useCallback(() => {
    if (lpTimerRef.current != null) {
      window.clearTimeout(lpTimerRef.current);
      lpTimerRef.current = null;
    }
  }, []);

  const closeMessageFocus = useCallback(() => {
    setMessageFocus(null);
    setSelectedIds((prev) => (selectMode ? prev : new Set()));
  }, [selectMode]);

  useEffect(() => {
    if (!messageFocus || selectMode) return;

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMessageFocus();
      }
    };

    messageFocusClosingViaPopRef.current = false;
    messageFocusHistoryPushedRef.current = false;
    try {
      window.history.pushState({ souqMessageFocus: true }, "");
      messageFocusHistoryPushedRef.current = true;
    } catch {
      /* history unavailable */
    }

    const onPopState = () => {
      messageFocusClosingViaPopRef.current = true;
      closeMessageFocus();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
      if (
        messageFocusHistoryPushedRef.current &&
        !messageFocusClosingViaPopRef.current &&
        window.history.state?.souqMessageFocus
      ) {
        window.history.back();
      }
      messageFocusHistoryPushedRef.current = false;
      messageFocusClosingViaPopRef.current = false;
    };
  }, [messageFocus, selectMode, closeMessageFocus]);

  const exitSelectMode = useCallback(() => {
    clearLongPressTimer();
    setSelectMode(false);
    setSelectedIds(new Set());
    setDeleteSheetOpen(false);
    setMessageFocus(null);
  }, [clearLongPressTimer]);

  useEffect(() => {
    if (selectMode && selectedIds.size < 2) {
      exitSelectMode();
    }
  }, [exitSelectMode, selectMode, selectedIds.size]);

  useEffect(() => {
    if (!conversationOk || messages == null) return;
    clearConversationUnreadInInboxCache(queryClient, conversationId);
  }, [conversationId, conversationOk, messages, queryClient]);

  const openMessageFocus = useCallback((m: ChatMessage, bubbleEl: HTMLElement) => {
    if (isMessageDeletedForEveryone(m)) return;
    const rect = bubbleEl.getBoundingClientRect();
    setSelectMode(false);
    setSelectedIds(new Set([m.id]));
    setMessageFocus({
      message: m,
      anchor: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  }, []);

  const startReply = useCallback(
    (m: ChatMessage) => {
      setReplyToMessage(m);
      closeMessageFocus();
      requestAnimationFrame(() => {
        composerTextareaRef.current?.focus();
      });
    },
    [closeMessageFocus],
  );

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onMessagePointerDown = (
    m: ChatMessage,
    e: React.PointerEvent,
    bubbleEl: HTMLElement,
  ) => {
    if (selectMode) return;
    if (messageFocus && messageFocus.message.id === m.id) return;
    clearLongPressTimer();
    const targetEl = bubbleEl;
    lpTimerRef.current = window.setTimeout(() => {
      lpTimerRef.current = null;
      longPressConsumedRef.current = true;
      openMessageFocus(m, targetEl);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          /* optional haptic */
        }
      }
    }, 480);
  };

  const onMessagePointerEnd = () => {
    clearLongPressTimer();
  };

  const addSecondMessageToSelection = useCallback(
    (m: ChatMessage) => {
      if (!messageFocus || selectMode) return;
      if (m.id === messageFocus.message.id) return;
      setSelectMode(true);
      setSelectedIds(new Set([messageFocus.message.id, m.id]));
      setMessageFocus(null);
    },
    [messageFocus, selectMode],
  );

  const onMessageTapWhileFocus = useCallback(
    (m: ChatMessage) => {
      addSecondMessageToSelection(m);
    },
    [addSecondMessageToSelection],
  );

  const onMessageClick = (m: ChatMessage, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (longPressConsumedRef.current) {
      longPressConsumedRef.current = false;
      return;
    }
    if (messageFocus && !selectMode) {
      e.preventDefault();
      if (m.id === messageFocus.message.id) {
        closeMessageFocus();
        return;
      }
      addSecondMessageToSelection(m);
      return;
    }
    if (!selectMode) return;
    e.preventDefault();
    toggleSelected(m.id);
  };

  const onSwipeReply = (m: ChatMessage) => {
    if (selectMode || isMessageDeletedForEveryone(m)) return;
    closeMessageFocus();
    startReply(m);
  };

  const scrollToMessage = useCallback(
    (messageId: number): boolean => {
      const el = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightMessageId(messageId);
      window.setTimeout(() => setHighlightMessageId(null), 1800);
      return true;
    },
    [],
  );

  const openForwardPicker = useCallback((msgs: ChatMessage[]) => {
    const forwardable = filterForwardableMessages(msgs);
    if (!forwardable.length) {
      const cap = msgs[0] ? resolveForwardCapability(msgs[0]) : null;
      toast({
        title: t(
          cap?.kind === "unsupported" ? cap.reasonKey : "message_thread.forward_unsupported",
        ),
        variant: "destructive",
      });
      return;
    }
    setForwardMessages(forwardable);
    setForwardPickerOpen(true);
  }, [toast, t]);

  const onForwardSelected = useCallback(() => {
    if (!selectedIds.size || !messages?.length) return;
    const selected = messages.filter((m) => selectedIds.has(m.id));
    openForwardPicker(selected);
    exitSelectMode();
  }, [selectedIds, messages, openForwardPicker, exitSelectMode]);

  const navigateToQuotedMessage = useCallback(
    (sourceMessageId: number) => {
      const stillInThread = (messages ?? []).some(
        (m) => m.id === sourceMessageId && !isMessageDeletedForEveryone(m),
      );
      if (!stillInThread || !scrollToMessage(sourceMessageId)) {
        toast({
          title: t("message_thread.reply_source_unavailable"),
          variant: "destructive",
        });
      }
    },
    [messages, scrollToMessage, toast, t],
  );

  const navigateToReplySource = useCallback(() => {
    if (!replyToMessage) return;
    navigateToQuotedMessage(replyToMessage.id);
  }, [replyToMessage, navigateToQuotedMessage]);

  const buildReplyQuoteData = useCallback(
    (source: Pick<ChatMessage, "id" | "senderId" | "body" | "messageType" | "imageUrl" | "deletedForEveryoneAt">): MessageReplyQuoteData => {
      const isMine = source.senderId === user?.id;
      const authorLabel = t("message_thread.reply_preview_label", {
        name: isMine
          ? t("message_thread.reply_preview_self")
          : conv?.otherName?.trim() || t("messages.user"),
      });
      let preview: string;
      if (source.deletedForEveryoneAt) {
        preview = isMine
          ? t("message_thread.deleted_for_everyone_by_me")
          : t("message_thread.deleted_for_everyone_by_peer");
      } else {
        preview =
          getChatMessageCopyText(source as ChatMessage) ??
          (source.messageType === "image"
            ? t("message_thread.reply_preview_image")
            : t("message_thread.reply_preview_empty"));
      }
      return {
        sourceMessageId: source.id,
        authorLabel,
        preview,
      };
    },
    [user?.id, conv?.otherName, t],
  );

  const replyQuotesByMessageId = useMemo(() => {
    const list = messages ?? [];
    const byId = new Map(list.map((m) => [m.id, m]));
    const map: Record<number, MessageReplyQuoteData> = {};
    for (const m of list) {
      const quoted =
        m.quotedMessage ??
        (m.replyToMessageId != null
          ? (() => {
              const src = byId.get(m.replyToMessageId);
              return src ? toQuotedMessageFromChat(src) : null;
            })()
          : null);
      if (!quoted) continue;
      map[m.id] = buildReplyQuoteData(quoted);
    }
    return map;
  }, [messages, buildReplyQuoteData]);

  const onMessageRowKeyDown = (m: ChatMessage, e: React.KeyboardEvent) => {
    if (!selectMode) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelected(m.id);
    }
  };

  const selectableMessages = useMemo(
    () =>
      (messages ?? []).filter((m) => !isMessageDeletedForEveryone(m)),
    [messages],
  );

  const enterMultiSelectFromFocus = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set(selectableMessages.map((m) => m.id)));
    setMessageFocus(null);
  }, [selectableMessages]);

  const canDeleteSelectedForEveryone = useMemo(() => {
    if (!user || !selectedIds.size || !messages?.length) return false;
    const selected = (messages ?? []).filter((m) => selectedIds.has(m.id));
    if (selected.length !== selectedIds.size) return false;
    return selected.every(
      (m) => m.senderId === user.id && !isMessageDeletedForEveryone(m),
    );
  }, [user, selectedIds, messages]);

  const canReplySelected = selectedIds.size === 1;

  const canCopySelected = useMemo(
    () => selectionHasCopyableMessages(messages, selectedIds),
    [messages, selectedIds],
  );

  const canForwardSelected = useMemo(() => {
    if (!selectedIds.size || !messages?.length) return false;
    const selected = messages.filter((m) => selectedIds.has(m.id));
    return filterForwardableMessages(selected).length > 0;
  }, [messages, selectedIds]);

  const onCopySelected = useCallback(async () => {
    if (!selectedIds.size || !canCopySelected) return;
    const texts = (messages ?? [])
      .filter((m) => selectedIds.has(m.id))
      .map((m) => getChatMessageCopyText(m))
      .filter((line): line is string => line != null && line.length > 0);
    if (!texts.length) {
      toast({
        title: t("message_thread.select_copy_empty"),
        variant: "destructive",
      });
      return;
    }
    const payload = texts.join("\n");
    const ok = await copyTextToClipboard(payload);
    if (!ok) {
      toast({
        title: t("message_thread.select_copy_failed"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: t("message_thread.select_copy_done") });
    exitSelectMode();
  }, [selectedIds, messages, canCopySelected, toast, t, exitSelectMode]);

  const onDeleteSelectedForEveryone = useCallback(async () => {
    if (!conversationOk || !user || !selectedIds.size) return;
    const mineIds = [...selectedIds].filter((id) => {
      const m = messages?.find((x) => x.id === id);
      return m != null && m.senderId === user.id;
    });
    if (!mineIds.length) return;
    setSelectionActionBusy(true);
    try {
      const result = await deleteMessagesForEveryone(conversationId, mineIds);
      if (result.deletedForEveryoneAt) {
        markMessagesDeletedForEveryoneInCache(
          result.messageIds,
          result.deletedForEveryoneAt,
        );
      } else {
        removeMessagesFromCache(result.messageIds);
      }
      exitSelectMode();
      void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    } catch (err: unknown) {
      toast({
        title: t("message_thread.delete_for_everyone_failed"),
        description: userSafeToastDescription(err),
        variant: "destructive",
      });
    } finally {
      setSelectionActionBusy(false);
    }
  }, [
    conversationOk,
    user,
    selectedIds,
    messages,
    conversationId,
    removeMessagesFromCache,
    markMessagesDeletedForEveryoneInCache,
    exitSelectMode,
    queryClient,
    toast,
    t,
  ]);

  const stableRowPointerDown = useCallback(
    (m: ChatMessage, e: React.PointerEvent, bubbleEl: HTMLElement) => {
      rowPointerDownRef.current(m, e, bubbleEl);
    },
    [],
  );
  const stableSwipeReply = useCallback((m: ChatMessage) => {
    rowSwipeReplyRef.current(m);
  }, []);
  const stableReplyQuoteNavigate = useCallback(
    (sourceMessageId: number) => {
      navigateToQuotedMessage(sourceMessageId);
    },
    [navigateToQuotedMessage],
  );
  const stableRowPointerEnd = useCallback(() => {
    rowPointerEndRef.current();
  }, []);
  const stableRowTapWhileFocus = useCallback((m: ChatMessage) => {
    rowTapWhileFocusRef.current(m);
  }, []);
  const stableRowClick = useCallback((m: ChatMessage, e: React.MouseEvent) => {
    rowClickRef.current(m, e);
  }, []);
  const stableRowKeyDown = useCallback((m: ChatMessage, e: React.KeyboardEvent) => {
    rowKeyDownRef.current(m, e);
  }, []);

  const selectAllMessages = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set(selectableMessages.map((m) => m.id)));
  }, [selectableMessages]);

  const onReplySelected = useCallback(() => {
    if (selectedIds.size !== 1 || !messages?.length) return;
    const id = [...selectedIds][0]!;
    const msg = messages.find((x) => x.id === id);
    if (!msg || isMessageDeletedForEveryone(msg)) return;
    startReply(msg);
    exitSelectMode();
  }, [selectedIds, messages, startReply, exitSelectMode]);

  const onFocusCopy = useCallback(async () => {
    if (!messageFocus) return;
    const text = getChatMessageCopyText(messageFocus.message);
    if (!text?.length) {
      toast({
        title: t("message_thread.select_copy_empty"),
        variant: "destructive",
      });
      return;
    }
    const ok = await copyTextToClipboard(text);
    if (!ok) {
      toast({
        title: t("message_thread.select_copy_failed"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: t("message_thread.select_copy_done") });
    closeMessageFocus();
  }, [messageFocus, toast, t, closeMessageFocus]);

  const onFocusDeleteForMe = useCallback(() => {
    if (!messageFocus || !conversationOk || selectionActionBusy) return;
    const id = messageFocus.message.id;
    setSelectionActionBusy(true);
    hideMessagesForMe.mutate(
      { convId: conversationId, data: { messageIds: [id] } },
      {
        onSuccess: () => {
          removeMessagesFromCache([id]);
          closeMessageFocus();
          void queryClient.invalidateQueries({
            queryKey: getListMessagesQueryKey(convIdForQuery),
          });
        },
        onError: (err: unknown) => {
          toast({
            title: t("message_thread.delete_for_me_failed"),
            description: userSafeToastDescription(err),
            variant: "destructive",
          });
        },
        onSettled: () => {
          setSelectionActionBusy(false);
        },
      },
    );
  }, [
    messageFocus,
    conversationOk,
    selectionActionBusy,
    hideMessagesForMe,
    conversationId,
    removeMessagesFromCache,
    closeMessageFocus,
    queryClient,
    convIdForQuery,
    toast,
    t,
  ]);

  const onFocusDeleteForEveryone = useCallback(async () => {
    if (!messageFocus || !conversationOk || !user || selectionActionBusy) return;
    const m = messageFocus.message;
    if (m.senderId !== user.id || isMessageDeletedForEveryone(m)) return;
    setSelectionActionBusy(true);
    try {
      const result = await deleteMessagesForEveryone(conversationId, [m.id]);
      if (result.deletedForEveryoneAt) {
        markMessagesDeletedForEveryoneInCache(
          result.messageIds,
          result.deletedForEveryoneAt,
        );
      } else {
        removeMessagesFromCache(result.messageIds);
      }
      closeMessageFocus();
      void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    } catch (err: unknown) {
      toast({
        title: t("message_thread.delete_for_everyone_failed"),
        description: userSafeToastDescription(err),
        variant: "destructive",
      });
    } finally {
      setSelectionActionBusy(false);
    }
  }, [
    messageFocus,
    conversationOk,
    user,
    selectionActionBusy,
    conversationId,
    markMessagesDeletedForEveryoneInCache,
    removeMessagesFromCache,
    closeMessageFocus,
    queryClient,
    toast,
    t,
  ]);

  const onReactionPick = useCallback(
    (emoji: string) => {
      if (!messageFocus || !conversationOk) return;
      const messageId = messageFocus.message.id;
      const prevReaction = messageReactions[messageId] ?? null;
      const optimisticReaction = prevReaction === emoji ? null : emoji;
      patchMessageReactionInCache(messageId, optimisticReaction);
      closeMessageFocus();
      void (async () => {
        try {
          const result = await setMessageReaction(conversationId, messageId, emoji);
          patchMessageReactionInCache(result.messageId, result.myReaction);
        } catch (err: unknown) {
          patchMessageReactionInCache(messageId, prevReaction);
          toast({
            title: t("message_thread.reaction_save_failed"),
            description: userSafeToastDescription(err),
            variant: "destructive",
          });
        }
      })();
    },
    [
      messageFocus,
      conversationOk,
      conversationId,
      messageReactions,
      patchMessageReactionInCache,
      closeMessageFocus,
      toast,
      t,
    ],
  );

  const onFocusSelectAll = useCallback(() => {
    if (!messageFocus) return;
    enterMultiSelectFromFocus();
  }, [messageFocus, enterMultiSelectFromFocus]);

  const onDeleteSelectedForMe = () => {
    if (!selectedIds.size || !conversationOk || selectionActionBusy) return;
    setSelectionActionBusy(true);
    hideMessagesForMe.mutate(
      { convId: conversationId, data: { messageIds: [...selectedIds] } },
      {
        onSuccess: () => {
          removeMessagesFromCache([...selectedIds]);
          exitSelectMode();
          void queryClient.invalidateQueries({
            queryKey: getListMessagesQueryKey(convIdForQuery),
          });
        },
        onError: (err: unknown) => {
          toast({
            title: t("message_thread.delete_for_me_failed"),
            description: userSafeToastDescription(err),
            variant: "destructive",
          });
        },
        onSettled: () => {
          setSelectionActionBusy(false);
        },
      },
    );
  };

  useEffect(() => {
    return () => {
      if (typingHideRef.current) clearTimeout(typingHideRef.current);
      if (lpTimerRef.current != null) window.clearTimeout(lpTimerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  /** مرة واحدة عند فتح المحادثة بعد وصول الرسائل — لا نربط التمرير بكل تغيّر مرجع messages. */
  const messagesLength = messages?.length ?? 0;
  useLayoutEffect(() => {
    if (!conversationOk || messagesLength === 0) return;
    if (scrollAnchorConvRef.current !== conversationId) {
      scrollAnchorConvRef.current = conversationId;
      initialScrollDoneRef.current = false;
    }
    if (initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    scrollToBottom();
  }, [conversationOk, conversationId, messagesLength, scrollToBottom]);

  useEffect(() => {
    if (!conversationOk) return;
    const qs = resolveSearchString(search);
    const paramsQs = new URLSearchParams(
      qs.startsWith("?") ? qs.slice(1) : qs,
    );
    const draftFromUrl = paramsQs.get("draft");
    const storageKey = messageDraftStorageKey(conversationId);

    if (draftFromUrl) {
      try {
        sessionStorage.setItem(storageKey, draftFromUrl);
      } catch {
        /* ignore quota / private mode */
      }
      setBody(draftFromUrl);
      navigate(`/messages/${conversationId}`, { replace: true });
      return;
    }

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        sessionStorage.removeItem(storageKey);
        setBody(stored);
      }
    } catch {
      /* ignore */
    }
  }, [conversationOk, conversationId, search, navigate]);

  if (authLoading) {
    return (
      <div
        className="fixed inset-0 z-0 flex h-[100svh] w-full items-center justify-center bg-[#0A0A0A]"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <Skeleton className="h-12 w-48 rounded-xl bg-[#0A0A0A]/70" />
      </div>
    );
  }

  if (!user) {
    const qs =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : "";
    return (
      <Redirect
        to={`/guest-welcome?redirect=${encodeURIComponent(`/messages/${rawConvParam ?? ""}${qs}`)}`}
      />
    );
  }

  if (!conversationOk) {
    return (
      <div
        className="fixed inset-0 z-30 flex h-[100svh] w-full flex-col items-center justify-center gap-4 bg-[#0A0A0A] p-6 text-center"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <p className="max-w-sm text-sm text-zinc-300">
          {t("message_thread.invalid_conversation")}
        </p>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="rounded-full border border-primary/40 bg-primary/15 px-6 py-2 text-sm font-medium text-primary hover:bg-primary/25"
        >
          {t("message_thread.back_to_inbox")}
        </button>
      </div>
    );
  }

  const hasStoredMessages = Boolean(messages && messages.length > 0);
  /** skeleton فقط أثناء أول جلب بدون أي صفوف — إذا وصلت مصفوفة (حتى فارغة) من النجاح لا نعيد وضع skeleton */
  const showMessagesSkeleton =
    messagesQueryEnabled &&
    isPending &&
    messages == null &&
    !isError;

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!conversationOk) return;
    composerSendingRef.current = true;
    flushTypingToPeer();
    if (composerLocked) {
      composerSendingRef.current = false;
      toast({
        title: t("message_thread.chat_send_blocked_toast_title"),
        description: peerBlockPending
          ? undefined
          : t("message_thread.chat_send_blocked_toast_body"),
        variant: "destructive",
      });
      return;
    }
    const trimmed = body.trim();
    if (!trimmed && !pendingImageFile) {
      composerSendingRef.current = false;
      return;
    }

    const replyingTo = replyToMessage;

    const onSuccess = (newMsg: ChatMessage) => {
      const mergedMsg = enrichSentMessageWithReply(newMsg, replyingTo);
      setBody("");
      setPendingImageFile(null);
      setReplyToMessage(null);
      scrollToBottom();
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) => mergeMessagesIntoList(old, mergedMsg),
      );
      composerSendingRef.current = false;
    };

    const onSendBlockedOrError = (err: unknown) => {
      composerSendingRef.current = false;
      if (err instanceof ApiError && err.status === 403) {
        void queryClient.invalidateQueries({ queryKey: peerBlockQueryKey });
        void invalidateUserPresenceBatchQueries(queryClient, peerPresenceTargets);
        toast({
          title: t("message_thread.chat_send_blocked_toast_title"),
          description: userSafeToastDescription(err) ?? t("message_thread.chat_send_blocked_toast_body"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("ad_detail.error"),
        description: userSafeToastDescription(err),
        variant: "destructive",
      });
    };

    if (pendingImageFile) {
      void (async () => {
        setUploadBusy(true);
        try {
          const imageUrl = await postChatImageUpload(conversationId, pendingImageFile);
          send.mutate(
            {
              convId: conversationId,
              data: {
                imageUrl,
                ...(trimmed ? { body: trimmed } : {}),
                ...(replyingTo ? { replyToMessageId: replyingTo.id } : {}),
              },
            },
            {
              onSuccess,
              onError: (err) => {
                composerSendingRef.current = false;
                if (err instanceof ApiError && err.status === 403) {
                  void queryClient.invalidateQueries({ queryKey: peerBlockQueryKey });
                  void invalidateUserPresenceBatchQueries(queryClient, peerPresenceTargets);
                  toast({
                    title: t("message_thread.chat_send_blocked_toast_title"),
                    description: userSafeToastDescription(err) ?? t("message_thread.chat_send_blocked_toast_body"),
                    variant: "destructive",
                  });
                  return;
                }
                toast({
                  title: t("message_thread.image_upload_failed"),
                  description: userSafeToastDescription(err),
                  variant: "destructive",
                });
              },
              onSettled: () => setUploadBusy(false),
            },
          );
        } catch (err) {
          composerSendingRef.current = false;
          setUploadBusy(false);
          toast({
            title: t("message_thread.image_upload_failed"),
            description: userSafeToastDescription(err),
            variant: "destructive",
          });
        }
      })();
      return;
    }

    send.mutate(
      {
        convId: conversationId,
        data: {
          body: trimmed,
          ...(replyingTo ? { replyToMessageId: replyingTo.id } : {}),
        },
      },
      {
        onSuccess,
        onError: onSendBlockedOrError,
      },
    );
  };

  const applyPickedImageFile = (f: File) => {
    if (composerLocked) {
      toast({
        title: t("message_thread.chat_send_blocked_toast_title"),
        description: t("message_thread.chat_send_blocked_toast_body"),
        variant: "destructive",
      });
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast({
        title: t("message_thread.image_upload_failed"),
        variant: "destructive",
      });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({
        title: t("message_thread.image_upload_failed"),
        variant: "destructive",
      });
      return;
    }
    setPendingImageFile(f);
  };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    applyPickedImageFile(f);
  };

  const busy = send.isPending || uploadBusy;

  const onAttachmentSelect = (kind: ChatAttachmentKind) => {
    if (composerLocked || busy) return;
    if (kind === "camera") {
      cameraInputRef.current?.click();
      return;
    }
    if (kind === "gallery") {
      galleryInputRef.current?.click();
      return;
    }
    if (kind === "file") {
      fileAttachInputRef.current?.click();
    }
  };

  const onGenericFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type.startsWith("image/")) {
      applyPickedImageFile(f);
      return;
    }
    toast({
      title: t("message_thread.attach_file_unsupported"),
      variant: "destructive",
    });
  };

  const canSend = Boolean(body.trim() || pendingImageFile);

  const quickKeys =
    conv?.isSeller === true
      ? SELLER_QUICK_KEYS
      : conv?.isSeller === false
        ? BUYER_QUICK_KEYS
        : null;
  const dirRtl = locale === "ar";

  const showPeerTyping =
    peerTyping &&
    !chatPeerMessagingDisabled &&
    !peerBlockPending &&
    !peerBlockQueryError;

  const appendQuick = (line: string) => {
    if (composerLocked) return;
    setBody((prev) => {
      const p = prev.trim();
      return p ? `${p}\n${line}` : line;
    });
  };

  const quickReplies = quickKeys?.map((key) => t(key)) ?? [];

  const dismissMenuTip = () => {
    setSeenFlag(CHAT_MENU_TIP_SEEN_KEY);
    setMenuTipSeen(true);
  };
  const dismissSelectionTip = () => {
    setSeenFlag(MESSAGE_SELECTION_TIP_SEEN_KEY);
    setSelectionTipSeen(true);
  };
  const dismissQuickTip = () => {
    setSeenFlag(QUICK_REPLIES_TIP_SEEN_KEY);
    setQuickTipSeen(true);
  };

  rowPointerDownRef.current = onMessagePointerDown;
  rowPointerEndRef.current = onMessagePointerEnd;
  rowClickRef.current = onMessageClick;
  rowKeyDownRef.current = onMessageRowKeyDown;
  rowSwipeReplyRef.current = onSwipeReply;
  rowTapWhileFocusRef.current = onMessageTapWhileFocus;

  return (
    <div
      className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#0A0A0A]"
      dir={dirRtl ? "rtl" : "ltr"}
    >
      {selectMode && selectedIds.size >= 2 ? (
        <ChatThreadSelectionHeader
          dirRtl={dirRtl}
          selectedCount={selectedIds.size}
          totalCount={selectableMessages.length}
          busy={selectionActionBusy || hideMessagesForMe.isPending}
          onCancel={exitSelectMode}
          onSelectAll={selectAllMessages}
        />
      ) : (
        <ChatThreadHeader
          conv={conv}
          dirRtl={dirRtl}
          showPeerTyping={showPeerTyping}
          peerPresenceEntry={peerPresenceEntry}
          peerPresenceLoading={peerPresenceQ.isPending && peerPresenceEnabled}
          menuTipSeen={menuTipSeen}
          onDismissMenuTip={dismissMenuTip}
          onBack={() => {
            if (orderReturnNumber) {
              navigate(
                orderReturnRole === "seller"
                  ? getSellerOrderDetailPath(orderReturnNumber)
                  : getBuyerOrderDetailPath(orderReturnNumber),
              );
            } else navigate("/messages");
          }}
        />
      )}

      {conv && !(selectMode && selectedIds.size >= 2) ? (
        <ChatConversationAdsBar
          conv={conv}
          dirRtl={dirRtl}
          onSelectAd={(ad) => {
            if (!conversationOk || send.isPending) return;
            send.mutate(
              {
                convId: conversationId,
                data: { referencedAdId: ad.adId },
              },
              {
                onError: (err) => {
                  toast({
                    title: t("ad_detail.error"),
                    description: userSafeToastDescription(err),
                    variant: "destructive",
                  });
                },
              },
            );
          }}
        />
      ) : null}

      <ChatThreadDeleteSheet
        open={deleteSheetOpen}
        dirRtl={dirRtl}
        selectedCount={selectedIds.size}
        canDeleteForEveryone={canDeleteSelectedForEveryone}
        busy={selectionActionBusy || hideMessagesForMe.isPending}
        onOpenChange={setDeleteSheetOpen}
        onConfirmDeleteForMe={onDeleteSelectedForMe}
        onConfirmDeleteForEveryone={() => void onDeleteSelectedForEveryone()}
      />

      {orderReturnNumber ? <OrderChatContextBanner orderNumber={orderReturnNumber} /> : null}

      {conversationOk && !selectionTipSeen && !selectMode && !messageFocus ? (
        <aside
          className="mx-auto w-full max-w-[820px] shrink-0 px-4 pb-1.5 pt-0 md:px-6"
          dir={dirRtl ? "rtl" : "ltr"}
          aria-label={t("message_thread.tip_selection_click")}
        >
          <div className={`${CHAT_TIP_CARD} p-2.5`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] leading-snug text-zinc-300">
                {t("message_thread.tip_selection_click")}
              </p>
              <button
                type="button"
                onClick={dismissSelectionTip}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] text-primary hover:bg-black/30"
                aria-label={t("message_thread.tip_close")}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col pl-1.5 pr-2.5 pt-2 md:pl-2 md:pr-4">
        <div
          ref={scrollRef}
          data-chat-scroll
          dir="ltr"
          onContextMenu={blockChatNativeMenu}
          onClick={(e) => {
            if (!messageFocus || selectMode) return;
            if ((e.target as HTMLElement).closest("[data-message-id]")) return;
            closeMessageFocus();
          }}
          className={cn(
            "relative flex min-h-0 flex-1 touch-pan-y flex-col gap-2 overflow-y-auto pb-3 pl-0 pr-0.5 pt-2",
            CHAT_MESSAGE_TOUCH_GUARD,
          )}
        >
            {isError && hasStoredMessages ? (
              <div className="sticky top-0 z-10 mb-1 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/35 bg-amber-950 px-3 py-2 text-[12px] text-amber-100">
                <span className="min-w-0 flex-1">
                  {t("message_thread.messages_sync_failed")}
                </span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="shrink-0 rounded-full border border-amber-500/50 bg-amber-950/60 px-3 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-900/70"
                >
                  {t("message_thread.retry")}
                </button>
              </div>
            ) : null}
            {showMessagesSkeleton ? (
              <>
                <Skeleton className="mr-auto h-[3.5rem] max-w-[75%] rounded-[17px] rounded-bl-[6px] border border-zinc-600/35 bg-[#151515]/80" />
                <Skeleton className="ml-auto h-[3.5rem] max-w-[75%] rounded-[17px] rounded-br-[6px] border border-primary/30 bg-[#0d1209]/80" />
              </>
            ) : isError && !hasStoredMessages ? (
              <div className="flex w-full flex-col items-center justify-center gap-3 py-14 text-center">
                <p className="max-w-sm text-sm text-red-300">
                  {t("message_thread.messages_load_error")}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-full border border-primary/40 bg-primary/15 px-5 py-2 text-sm font-medium text-primary hover:bg-primary/25"
                >
                  {t("message_thread.retry")}
                </button>
              </div>
            ) : hasStoredMessages ? (
              (messages ?? []).map((m: ChatMessage) => (
                <div
                  key={m.id}
                  className="relative flex w-full transition-opacity duration-150"
                >
                <ChatMessageBubbleRow
                  m={m}
                  mine={m.senderId === user!.id}
                  selectMode={selectMode}
                  showFocusSelectChrome={messageFocus != null && !selectMode}
                  isSelected={selectedIds.has(m.id)}
                  isFocused={messageFocus?.message.id === m.id}
                  isHighlighted={highlightMessageId === m.id}
                  myReaction={messageReactions[m.id] ?? null}
                  replyQuote={replyQuotesByMessageId[m.id] ?? null}
                  interactionLocked={
                    messageFocus != null &&
                    !selectMode &&
                    messageFocus.message.id !== m.id
                  }
                  dirRtl={dirRtl}
                  locale={locale as MessageBubbleLocale}
                  onRowPointerDown={stableRowPointerDown}
                  onRowPointerEnd={stableRowPointerEnd}
                  onRowTapWhileFocus={stableRowTapWhileFocus}
                  onRowClick={stableRowClick}
                  onRowKeyDown={stableRowKeyDown}
                  onSwipeReply={stableSwipeReply}
                  onReplyQuoteNavigate={stableReplyQuoteNavigate}
                />
                </div>
              ))
            ) : (
              <div className="flex w-full flex-col items-center justify-center py-12 text-sm text-zinc-500">
                {t("message_thread.empty_hint")}
              </div>
            )}
        </div>
      </div>

      {messageFocus && !selectMode ? (
        <ChatMessageFocusErrorBoundary onError={closeMessageFocus}>
          <ChatMessageFocusBackdrop />
          <ChatMessageReactionsBar
            anchor={messageFocus.anchor}
            messageId={messageFocus.message.id}
            dirRtl={dirRtl}
            onPick={onReactionPick}
          />
          <ChatMessageActionsSheet
            mode="focus"
            open
            dirRtl={dirRtl}
            message={messageFocus.message}
            mine={messageFocus.message.senderId === user?.id}
            canCopy={Boolean(getChatMessageCopyText(messageFocus.message))}
            canForward={
              resolveForwardCapability(messageFocus.message).kind === "send"
            }
            busy={selectionActionBusy || hideMessagesForMe.isPending}
            onOpenChange={(open) => {
              if (!open) closeMessageFocus();
            }}
            onReply={() => startReply(messageFocus.message)}
            onForward={() => openForwardPicker([messageFocus.message])}
            onCopy={() => void onFocusCopy()}
            onSelectAll={onFocusSelectAll}
            onDeleteForMe={onFocusDeleteForMe}
            onDeleteForEveryone={() => void onFocusDeleteForEveryone()}
          />
        </ChatMessageFocusErrorBoundary>
      ) : null}

      {selectMode && selectedIds.size >= 2 ? (
        <ChatMessageActionsSheet
          mode="multi"
          open
          dirRtl={dirRtl}
          selectedCount={selectedIds.size}
          canReply={canReplySelected}
          canCopy={canCopySelected}
          canForward={canForwardSelected}
          canDeleteForEveryone={canDeleteSelectedForEveryone}
          busy={selectionActionBusy || hideMessagesForMe.isPending}
          onReply={onReplySelected}
          onForward={onForwardSelected}
          onCopy={() => void onCopySelected()}
          onDeleteForMe={onDeleteSelectedForMe}
          onDeleteForEveryone={() => void onDeleteSelectedForEveryone()}
        />
      ) : null}

      <ChatForwardPickerSheet
        open={forwardPickerOpen}
        dirRtl={dirRtl}
        currentConvId={conversationId}
        messages={forwardMessages}
        onOpenChange={setForwardPickerOpen}
        onDone={({ sent, failed }) => {
          if (sent > 0 && failed === 0) {
            toast({ title: t("message_thread.forward_success", { count: sent }) });
          } else if (sent > 0) {
            toast({
              title: t("message_thread.forward_partial", { sent, failed }),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("message_thread.forward_failed"),
              variant: "destructive",
            });
          }
        }}
      />

      <form
        ref={composerFormRef}
        onSubmit={handleSend}
        className={cn(
          "z-50 w-full shrink-0 border-t border-primary/18 bg-[#0A0A0A] px-2.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_-12px_rgba(0,0,0,0.6)]",
          selectMode && "pointer-events-none opacity-40",
        )}
      >
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-1.5">
          {replyToMessage ? (
            <ChatReplyPreviewBar
              message={replyToMessage}
              peerName={conv?.otherName}
              currentUserId={user?.id}
              dirRtl={dirRtl}
              onCancel={() => setReplyToMessage(null)}
              onNavigateToSource={navigateToReplySource}
            />
          ) : null}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onImageSelected}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onImageSelected}
          />
          <input
            ref={fileAttachInputRef}
            type="file"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onGenericFileSelected}
          />
          {pendingImagePreviewUrl ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-[#0A0A0A] p-2 shadow-[0_0_14px_-12px_hsl(var(--primary)/0.14)]">
              <img
                src={pendingImagePreviewUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-primary/30 object-cover"
                loading="eager"
                decoding="async"
                sizes="56px"
              />
              <button
                type="button"
                onClick={() => setPendingImageFile(null)}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-[#0A0A0A] px-3 text-[12px] font-medium text-primary hover:bg-primary/10"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                {t("message_thread.remove_image")}
              </button>
            </div>
          ) : null}
          {conv && (
            <>
              {!quickTipSeen ? (
                <div
                  className={`${CHAT_TIP_CARD} mb-1.5 p-2.5`}
                  dir={dirRtl ? "rtl" : "ltr"}
                >
                  <p className="mb-1 text-[11px] leading-snug text-zinc-300">
                    {t("message_thread.tip_quick_reply")}
                  </p>
                  <p className="mb-2 text-[11px] font-semibold text-primary">
                    {t("message_thread.tip_swipe_arrows")}
                  </p>
                  <button
                    type="button"
                    onClick={dismissQuickTip}
                    className="w-full rounded-lg border border-primary/40 bg-primary/10 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/16"
                  >
                    {t("message_thread.tip_ok")}
                  </button>
                </div>
              ) : null}
              {quickKeys ? (
                <div className={CHAT_QUICK_REPLY_ROW}>
                  {quickReplies.map((line, index) => (
                    <button
                      key={`${quickKeys[index]}`}
                      type="button"
                      disabled={composerLocked}
                      onClick={() => appendQuick(line)}
                      className={CHAT_QUICK_REPLY_CHIP}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              ) : null}
              {peerBlockQueryEnabled && !peerBlockPending && chatPeerMessagingDisabled ? (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-[12px] leading-relaxed text-amber-50 shadow-[0_0_16px_-12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/15"
                  dir={dirRtl ? "rtl" : "ltr"}
                >
                  {peerBlockStatus?.blockedByMe ? (
                    <p className="mb-1.5 last:mb-0">
                      {t("message_thread.chat_composer_blocked_by_me")}
                    </p>
                  ) : null}
                  {peerBlockStatus?.blockedByMe && !peerBlockStatus?.blocksMe ? (
                    <button
                      type="button"
                      disabled={inlineUnblockPending}
                      onClick={() => setInlineUnblockConfirmOpen(true)}
                      className="mt-2 inline-flex min-h-[2.25rem] items-center justify-center rounded-xl border border-primary/45 bg-primary/12 px-3.5 py-2 text-[12px] font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/15 transition-colors hover:border-primary/60 hover:bg-primary/18 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                    >
                      {inlineUnblockPending ? "…" : t("message_thread.chat_unblock_menu")}
                    </button>
                  ) : null}
                  {peerBlockStatus?.blocksMe ? (
                    <p className={cn("mb-0", peerBlockStatus?.blockedByMe ? "mt-2" : "")}>
                      {t("message_thread.chat_composer_blocked_by_peer")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          <div className="flex min-w-0 items-end gap-1.5">
            <div className={CHAT_COMPOSER_FIELD_SHELL} dir="ltr">
              <ChatComposerEmojiButton
                dirRtl={dirRtl}
                disabled={busy || composerLocked}
                open={composerEmojiOpen}
                onOpenChange={(next) => {
                  if (next) composerTextareaRef.current?.blur();
                  setComposerEmojiOpen(next);
                }}
                onPick={insertComposerEmoji}
              />
              <textarea
                ref={composerTextareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => {
                  setComposerEmojiOpen(false);
                  setComposerFocused(true);
                }}
                onBlur={() => {
                  if (composerSendingRef.current) return;
                  window.setTimeout(() => {
                    if (composerSendingRef.current) return;
                    if (composerTextareaRef.current === document.activeElement) return;
                    if (composerFormRef.current?.contains(document.activeElement)) return;
                    setComposerFocused(false);
                  }, 80);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={t("message_thread.placeholder")}
                rows={1}
                disabled={composerLocked}
                dir={dirRtl ? "rtl" : "ltr"}
                className={CHAT_COMPOSER_TEXTAREA}
              />
              <ChatComposerAttachButton
                dirRtl={dirRtl}
                disabled={busy || composerLocked}
                onClick={() => setAttachSheetOpen(true)}
              />
            </div>
            <button
              type="button"
              tabIndex={-1}
              disabled={busy || !canSend || composerLocked}
              onPointerDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => handleSend()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_14px_-8px_hsl(var(--primary)/0.48)] transition-[transform,box-shadow] hover:shadow-[0_0_18px_-8px_hsl(var(--primary)/0.58)] active:scale-[0.98] disabled:opacity-50"
              aria-label={t("message_thread.send")}
            >
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </form>

      <ChatComposerAttachmentSheet
        open={attachSheetOpen}
        onOpenChange={setAttachSheetOpen}
        dirRtl={dirRtl}
        disabled={busy || composerLocked}
        onSelect={onAttachmentSelect}
      />

      <AlertDialog
        open={inlineUnblockConfirmOpen}
        onOpenChange={(next) => {
          if (!inlineUnblockPending) setInlineUnblockConfirmOpen(next);
        }}
      >
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          className={cn(INLINE_UNBLOCK_ALERT_SURFACE, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader
            className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}
          >
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("message_thread.chat_unblock_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("message_thread.chat_unblock_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              dirRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              disabled={inlineUnblockPending}
              onClick={() => void performInlineUnblock()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-primary/45 bg-primary/15 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 transition-colors hover:bg-primary/22 disabled:pointer-events-none disabled:opacity-45 sm:flex-none",
              )}
            >
              {inlineUnblockPending ? "…" : t("message_thread.chat_unblock_confirm_cta")}
            </button>
            <AlertDialogCancel
              disabled={inlineUnblockPending}
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 disabled:opacity-45 sm:flex-none",
              )}
            >
              {t("message_thread.chat_unblock_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

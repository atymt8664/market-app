import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
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
  ApiError,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Ban,
  Check,
  CheckCheck,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { applyIncomingMessageToInboxCache } from "@/lib/inbox-conversation-cache";
import { deleteMessagesForEveryone } from "@/lib/chat-delete-for-everyone";
import {
  getChatMessageCopyText,
  selectionHasCopyableMessages,
} from "@/lib/chat-message-copy";
import { copyTextToClipboard } from "@/lib/copy-text";
import { isMessageDeletedForEveryone } from "@/lib/chat-message-deleted";
import { ChatSelectionActionBar } from "@/components/chat-selection-action-bar";
import {
  ChatComposerAttachButton,
  ChatComposerAttachmentSheet,
  type ChatAttachmentKind,
} from "@/components/chat-composer-attachment-sheet";
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
import { cn } from "@/lib/utils";
import {
  GC_THREAD_MESSAGES_MS,
  STALE_PEER_BLOCK_MS,
  STALE_THREAD_MESSAGES_MS,
} from "@/lib/query-stale-times";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { ChatThreadOverflowMenu } from "@/components/chat-thread-overflow-menu";
import { UserPresenceBadge } from "@/components/user-presence-badge";
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

/**
 * فقاعات — بدون isolate/overflow-hidden التي مع backdrop-blur على الأسلاف تسبب على WebKit اختفاء النص (stacking/compositing).
 */
const CHAT_BUBBLE_BASE =
  "relative overflow-visible rounded-2xl border border-primary/35 bg-[#0A0A0A] shadow-[0_0_26px_-14px_hsl(var(--primary)/0.22),0_4px_22px_-12px_rgba(0,0,0,0.42)] ring-1 ring-primary/15";

const CHAT_RECV_OUTER = `${CHAT_BUBBLE_BASE} rounded-bl-md`;

const CHAT_SENT_OUTER = `${CHAT_BUBBLE_BASE} rounded-br-md`;

const QUICK_REPLY_CHIP =
  "max-w-[240px] shrink-0 truncate whitespace-nowrap rounded-2xl border border-primary/35 bg-[#0A0A0A] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_22px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 transition-[transform,box-shadow,border-color] duration-200 hover:border-primary/55 hover:shadow-[0_0_28px_-12px_hsl(var(--primary)/0.28)] active:scale-[0.98]";

const QUICK_REPLY_ROW =
  "scrollbar-thin flex gap-2 overflow-x-auto rounded-2xl border border-primary/32 bg-[#0A0A0A] p-2.5 shadow-[0_0_24px_-16px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12";

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

/** دمج رسالة واردة في القائمة دون إعادة ترتيب كامل عند الإدراج في النهاية. */
function mergeMessagesIntoList(
  prev: ChatMessage[] | undefined,
  incoming: ChatMessage,
): ChatMessage[] {
  const list = prev ?? [];
  const idx = list.findIndex((m) => m.id === incoming.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...incoming };
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

function renderMessageRichText(raw: string, dirRtl: boolean): ReactNode {
  const text = raw || "";
  const segments = splitMessageSegments(text);
  const hasLink = segments.some((s) => s.kind === "link");
  const linkClass =
    "break-all font-medium text-primary underline decoration-primary/45 underline-offset-[3px] [overflow-wrap:anywhere]";
  if (!hasLink) {
    return (
      <span
        dir={dirRtl ? "rtl" : "ltr"}
        className="block whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white opacity-100 [overflow-wrap:anywhere] [-webkit-text-fill-color:#ffffff] [text-rendering:optimizeLegibility]"
      >
        {text}
      </span>
    );
  }
  return (
    <div
      dir={dirRtl ? "rtl" : "ltr"}
      className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white opacity-100 [overflow-wrap:anywhere] [-webkit-text-fill-color:#ffffff] [text-rendering:optimizeLegibility]"
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

type ChatMessageBubbleRowProps = {
  m: ChatMessage;
  mine: boolean;
  selectMode: boolean;
  isSelected: boolean;
  dirRtl: boolean;
  locale: MessageBubbleLocale;
  onRowPointerDown: (m: ChatMessage, e: PointerEvent) => void;
  onRowPointerEnd: () => void;
  onRowClick: (m: ChatMessage, e: MouseEvent) => void;
  onRowKeyDown: (m: ChatMessage, e: KeyboardEvent) => void;
};

function chatMessageBubbleRowPropsAreEqual(
  a: ChatMessageBubbleRowProps,
  b: ChatMessageBubbleRowProps,
): boolean {
  return (
    a.m === b.m &&
    a.mine === b.mine &&
    a.selectMode === b.selectMode &&
    a.isSelected === b.isSelected &&
    a.dirRtl === b.dirRtl &&
    a.locale === b.locale
  );
}

const ChatMessageBubbleRow = memo(function ChatMessageBubbleRow({
  m,
  mine,
  selectMode,
  isSelected,
  dirRtl,
  locale,
  onRowPointerDown,
  onRowPointerEnd,
  onRowClick,
  onRowKeyDown,
}: ChatMessageBubbleRowProps) {
  const deletedForEveryone = isMessageDeletedForEveryone(m);
  const plain = m.body ?? "";
  const isImageMsg = m.messageType === "image" && Boolean(m.imageUrl);
  const locationPayload = parseChatLocationBody(plain, m.messageType);
  const isLocationMsg =
    String(m.messageType) === CHAT_LOCATION_MESSAGE_TYPE && locationPayload != null;
  const showText = !deletedForEveryone && !isLocationMsg && plain.trim().length > 0;
  const showBubbleContent =
    deletedForEveryone || isImageMsg || isLocationMsg || showText;
  const deletedLabel = deletedForEveryone
    ? mine
      ? t("message_thread.deleted_for_everyone_by_me")
      : t("message_thread.deleted_for_everyone_by_peer")
    : null;
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-[min(100%,85%)] items-end gap-2 sm:max-w-[80%] md:max-w-[72%]",
        mine ? "flex-row-reverse self-end" : "flex-row self-start",
      )}
    >
      {selectMode ? (
        <span
          className={cn(
            "mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isSelected
              ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_-6px_hsl(var(--primary)/0.45)]"
              : "border-zinc-500 bg-[#0A0A0A] text-transparent",
          )}
          aria-hidden
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </span>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => onRowPointerDown(m, e)}
        onPointerUp={onRowPointerEnd}
        onPointerCancel={onRowPointerEnd}
        onPointerLeave={onRowPointerEnd}
        onClick={(e) => onRowClick(m, e)}
        onKeyDown={(e) => onRowKeyDown(m, e)}
        className={cn(
          "min-w-0 max-w-[min(100%,280px)] sm:max-w-[min(100%,300px)] md:max-w-[min(100%,320px)] touch-manipulation",
          selectMode ? "cursor-pointer" : "cursor-default",
          mine ? CHAT_SENT_OUTER : CHAT_RECV_OUTER,
        )}
      >
        <div
          className={cn(
            "relative z-[2] px-3 pb-2 pt-2.5 md:px-3.5 md:pb-2.5 md:pt-3",
            selectMode && "pointer-events-none",
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
            <div className="flex flex-col gap-2">
              {isLocationMsg && locationPayload ? (
                <ChatLocationMessageCard
                  location={locationPayload}
                  mine={mine}
                  dirRtl={dirRtl}
                />
              ) : null}
              {isImageMsg && m.imageUrl ? (
                <a
                  href={m.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="max-h-64 w-full max-w-[min(100%,280px)] rounded-xl border border-primary/35 object-cover shadow-[0_0_22px_-12px_hsl(var(--primary)/0.45)] ring-1 ring-primary/20 sm:max-w-[300px]"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) min(100vw - 3rem, 280px), 300px"
                  />
                </a>
              ) : null}
              {showText ? renderMessageRichText(plain, dirRtl) : null}
            </div>
          )}
          <div
            className={`mt-1.5 flex items-center gap-0.5 ${mine ? "justify-end" : "justify-start"}`}
            dir="ltr"
          >
            <time
              dateTime={m.createdAt}
              className="text-[10px] font-medium tabular-nums leading-none text-muted-foreground"
            >
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
  const rowPointerDownRef = useRef<(m: ChatMessage, e: PointerEvent) => void>(() => {});
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
  const lpTimerRef = useRef<number | null>(null);
  const longPressConsumedRef = useRef(false);
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

  useAutoResizeTextarea(composerTextareaRef, body);

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
      refetchOnMount: false,
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
  const peerPresenceQ = useUserPresenceBatch(peerPresenceTargets, {
    enabled:
      secondaryQueriesReady &&
      messagesQueryEnabled &&
      peerPresenceTargets.length > 0,
  });
  const peerPresenceEntry = peerPresenceQ.data?.byUserId[String(conv?.otherId ?? "")];

  const chatPeerMessagingDisabled =
    Boolean(peerBlockStatus?.blockedByMe) || Boolean(peerBlockStatus?.blocksMe);
  const composerLocked =
    peerBlockQueryEnabled &&
    (peerBlockPending || peerBlockQueryError || chatPeerMessagingDisabled);

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
  }, [conversationId]);

  const clearLongPressTimer = useCallback(() => {
    if (lpTimerRef.current != null) {
      window.clearTimeout(lpTimerRef.current);
      lpTimerRef.current = null;
    }
  }, []);

  const exitSelectMode = useCallback(() => {
    clearLongPressTimer();
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [clearLongPressTimer]);

  const enterSelectWith = useCallback((id: number) => {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onMessagePointerDown = (m: ChatMessage, e: React.PointerEvent) => {
    if (selectMode) return;
    if ((e.target as HTMLElement).closest("a")) return;
    clearLongPressTimer();
    lpTimerRef.current = window.setTimeout(() => {
      lpTimerRef.current = null;
      longPressConsumedRef.current = true;
      enterSelectWith(m.id);
    }, 480);
  };

  const onMessagePointerEnd = () => {
    clearLongPressTimer();
  };

  const onMessageClick = (m: ChatMessage, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    if (longPressConsumedRef.current) {
      longPressConsumedRef.current = false;
      return;
    }
    if (!selectMode) return;
    e.preventDefault();
    toggleSelected(m.id);
  };

  const onMessageRowKeyDown = (m: ChatMessage, e: React.KeyboardEvent) => {
    if (!selectMode) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelected(m.id);
    }
  };

  const canDeleteSelectedForEveryone = useMemo(() => {
    if (!user || !selectedIds.size || !messages?.length) return false;
    return [...selectedIds].some((id) => {
      const m = messages.find((x) => x.id === id);
      return (
        m != null &&
        m.senderId === user.id &&
        !isMessageDeletedForEveryone(m)
      );
    });
  }, [user, selectedIds, messages]);

  const canCopySelected = useMemo(
    () => selectionHasCopyableMessages(messages, selectedIds),
    [messages, selectedIds],
  );

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
        description: err instanceof Error && err.message ? err.message : undefined,
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

  const stableRowPointerDown = useCallback((m: ChatMessage, e: React.PointerEvent) => {
    rowPointerDownRef.current(m, e);
  }, []);
  const stableRowPointerEnd = useCallback(() => {
    rowPointerEndRef.current();
  }, []);
  const stableRowClick = useCallback((m: ChatMessage, e: React.MouseEvent) => {
    rowClickRef.current(m, e);
  }, []);
  const stableRowKeyDown = useCallback((m: ChatMessage, e: React.KeyboardEvent) => {
    rowKeyDownRef.current(m, e);
  }, []);

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
            description: err instanceof Error && err.message ? err.message : undefined,
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationOk) return;
    flushTypingToPeer();
    if (composerLocked) {
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
    if (!trimmed && !pendingImageFile) return;

    const onSuccess = (newMsg: ChatMessage) => {
      setBody("");
      setPendingImageFile(null);
      scrollToBottom();
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) => mergeMessagesIntoList(old, newMsg),
      );
    };

    const onSendBlockedOrError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        void queryClient.invalidateQueries({ queryKey: peerBlockQueryKey });
        void invalidateUserPresenceBatchQueries(queryClient, peerPresenceTargets);
        toast({
          title: t("message_thread.chat_send_blocked_toast_title"),
          description: err.message || t("message_thread.chat_send_blocked_toast_body"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("ad_detail.error"),
        description: err instanceof Error && err.message ? err.message : undefined,
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
              },
            },
            {
              onSuccess,
              onError: (err) => {
                if (err instanceof ApiError && err.status === 403) {
                  void queryClient.invalidateQueries({ queryKey: peerBlockQueryKey });
                  void invalidateUserPresenceBatchQueries(queryClient, peerPresenceTargets);
                  toast({
                    title: t("message_thread.chat_send_blocked_toast_title"),
                    description: err.message || t("message_thread.chat_send_blocked_toast_body"),
                    variant: "destructive",
                  });
                  return;
                }
                toast({
                  title:
                    err instanceof Error && err.message
                      ? err.message
                      : t("message_thread.image_upload_failed"),
                  variant: "destructive",
                });
              },
              onSettled: () => setUploadBusy(false),
            },
          );
        } catch (err) {
          setUploadBusy(false);
          toast({
            title:
              err instanceof Error && err.message
                ? err.message
                : t("message_thread.image_upload_failed"),
            variant: "destructive",
          });
        }
      })();
      return;
    }

    send.mutate(
      { convId: conversationId, data: { body: trimmed } },
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

  const quickKeys = conv?.isSeller ? SELLER_QUICK_KEYS : BUYER_QUICK_KEYS;
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

  const quickReplies = quickKeys.map((key) => t(key));

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

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A]"
      style={{ height: "100dvh" }}
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <header className="shrink-0 bg-[#0A0A0A] px-4 pb-2 pt-3 md:px-6">
        <div className="mx-auto w-full max-w-[820px] rounded-2xl border border-primary/35 bg-[#0A0A0A] px-3 py-2.5 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.12),0_4px_20px_-12px_rgba(0,0,0,0.45)] ring-1 ring-primary/15">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  if (selectMode) exitSelectMode();
                  else if (orderReturnNumber) {
                    navigate(
                      orderReturnRole === "seller"
                        ? getSellerOrderDetailPath(orderReturnNumber)
                        : getBuyerOrderDetailPath(orderReturnNumber),
                    );
                  }
                  else navigate("/messages");
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/60 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-black/90 active:opacity-90"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              {conv?.adImage && conv?.adAvailable !== false ? (
                <Link
                  href={`/ad/${conv.adId}`}
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-[#0A0A0A]"
                >
                  <img
                    src={conv.adImage}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                    sizes="44px"
                  />
                </Link>
              ) : (
                <div
                  className="h-11 w-11 shrink-0 rounded-xl border border-primary/25 bg-[#0A0A0A]"
                  title={
                    conv?.adAvailable === false
                      ? t("message_thread.menu_ad_unavailable")
                      : undefined
                  }
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                <div className="w-full min-w-0 truncate text-sm font-bold leading-tight text-white">
                  {conv?.otherName || "..."}
                </div>
                {showPeerTyping ? (
                  <div
                    className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium leading-tight text-primary/90 sm:text-[13px]"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="min-w-0 shrink truncate">{t("message_thread.typing")}</span>
                    <span className="inline-flex shrink-0 items-end gap-0.5 pb-0.5" aria-hidden>
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary [animation-duration:1s] [animation-delay:0ms]" />
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary/75 [animation-duration:1s] [animation-delay:120ms]" />
                      <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary/55 [animation-duration:1s] [animation-delay:240ms]" />
                    </span>
                  </div>
                ) : null}
                {peerPresenceTargets.length > 0 && secondaryQueriesReady && !showPeerTyping ? (
                  <div className="w-full min-w-0 max-w-full shrink-0">
                    <UserPresenceBadge
                      entry={peerPresenceEntry}
                      isLoading={peerPresenceQ.isPending}
                      variant="default"
                    />
                  </div>
                ) : null}
                {conv &&
                  (conv.adAvailable !== false ? (
                    <Link
                      href={`/ad/${conv.adId}`}
                      className="block truncate text-xs text-zinc-400 hover:text-primary"
                    >
                      {conv.adTitle}
                    </Link>
                  ) : (
                    <span
                      className="block truncate text-xs text-zinc-500"
                      title={t("message_thread.menu_ad_unavailable")}
                    >
                      {conv.adTitle || t("message_thread.menu_ad_unavailable")}
                    </span>
                  ))}
              </div>
            </div>
            {conv ? (
              <div className="relative">
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
                          onClick={dismissMenuTip}
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
                  conversationId={conversationId}
                  otherUserId={conv.otherId}
                  adId={conv.adId}
                  adAvailable={conv.adAvailable !== false}
                  dirRtl={dirRtl}
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {orderReturnNumber ? <OrderChatContextBanner orderNumber={orderReturnNumber} /> : null}

      {conversationOk && !selectionTipSeen ? (
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

      <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col px-4 pt-2 md:px-6">
        <div
          ref={scrollRef}
          data-chat-scroll
          className="flex min-h-0 flex-1 touch-pan-y flex-col items-start gap-2 overflow-y-auto px-3 pb-3 pt-2"
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
                <Skeleton className="h-[3.5rem] max-w-[75%] self-start rounded-2xl rounded-bl-md bg-[#0A0A0A]/70" />
                <Skeleton className="h-[3.5rem] max-w-[75%] self-end rounded-2xl rounded-br-md bg-[#0A0A0A]/70" />
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
                <ChatMessageBubbleRow
                  key={m.id}
                  m={m}
                  mine={m.senderId === user!.id}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(m.id)}
                  dirRtl={dirRtl}
                  locale={locale as MessageBubbleLocale}
                  onRowPointerDown={stableRowPointerDown}
                  onRowPointerEnd={stableRowPointerEnd}
                  onRowClick={stableRowClick}
                  onRowKeyDown={stableRowKeyDown}
                />
              ))
            ) : (
              <div className="flex w-full flex-col items-center justify-center py-12 text-sm text-zinc-500">
                {t("message_thread.empty_hint")}
              </div>
            )}
        </div>
        {selectMode ? (
          <ChatSelectionActionBar
            dirRtl={dirRtl}
            selectedCount={selectedIds.size}
            canDeleteForEveryone={canDeleteSelectedForEveryone}
            canCopy={canCopySelected}
            busy={selectionActionBusy || hideMessagesForMe.isPending}
            onDeleteForMe={onDeleteSelectedForMe}
            onDeleteForEveryone={() => void onDeleteSelectedForEveryone()}
            onCopy={() => void onCopySelected()}
            onCancel={exitSelectMode}
          />
        ) : null}
      </div>
      <form
        onSubmit={handleSend}
        className={cn(
          "sticky bottom-0 z-50 w-full shrink-0 border-t border-primary/20 bg-[#0A0A0A] px-3 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.65)]",
          selectMode && "pointer-events-none opacity-40",
        )}
      >
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-2">
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
              <div className={QUICK_REPLY_ROW}>
                {quickReplies.map((line) => (
                  <button
                    key={`fixed-${line}`}
                    type="button"
                    disabled={composerLocked}
                    onClick={() => appendQuick(line)}
                    className={QUICK_REPLY_CHIP}
                  >
                    {line}
                  </button>
                ))}
              </div>
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
          <div className="flex min-w-0 items-end gap-2">
            <div className={CHAT_COMPOSER_FIELD_SHELL} dir={dirRtl ? "rtl" : "ltr"}>
              <ChatComposerAttachButton
                dirRtl={dirRtl}
                disabled={busy || composerLocked}
                onClick={() => setAttachSheetOpen(true)}
              />
              <textarea
                ref={composerTextareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={t("message_thread.placeholder")}
                rows={1}
                disabled={composerLocked}
                className={CHAT_COMPOSER_TEXTAREA}
              />
            </div>
            <button
            type="submit"
            disabled={busy || !canSend || composerLocked}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_16px_-8px_hsl(var(--primary)/0.52)] transition-[transform,box-shadow] hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.62)] active:scale-[0.98] disabled:opacity-50"
            aria-label={t("message_thread.send")}
          >
            {send.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
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

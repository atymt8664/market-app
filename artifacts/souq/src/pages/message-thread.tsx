import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useHideMessagesForMe,
  type Message as ChatMessage,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { formatMessageTimestamp, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { ChatThreadOverflowMenu } from "@/components/chat-thread-overflow-menu";
import {
  CHAT_MENU_TIP_SEEN_KEY,
  MESSAGE_SELECTION_TIP_SEEN_KEY,
  QUICK_REPLIES_TIP_SEEN_KEY,
  readSeenFlag,
  setSeenFlag,
} from "@/lib/chat-tips-seen";

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

const BUYER_QUICK_REPLIES_AR = [
  "هل المنتج ما زال متوفراً؟",
  "هل السعر قابل للتفاوض؟",
  "أين يمكن الاستلام؟",
  "هل يوجد شحن؟",
] as const;

/** دمج رسالة واردة في القائمة دون إعادة كتابة الحقول */
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
  return [...list, incoming].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

const SELLER_QUICK_REPLIES_AR = [
  "نعم، المنتج متوفر",
  "السعر قابل للتفاوض بشكل بسيط",
  "يمكن الاستلام في [المدينة]",
  "الشحن متاح",
] as const;

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

async function postChatImageUpload(convId: number, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(apiUrl(`/api/conversations/${convId}/messages/upload-image`), {
    method: "POST",
    body: fd,
    credentials: "include",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      staleTime: 60_000,
      gcTime: 30 * 60_000,
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

  otherUserIdRef.current = conv?.otherId;

  const { send: wsSend } = useChatSocket((ev) => {
    if (!conversationOk) return;
    if (ev.type === "message" && ev.conversationId === conversationId) {
      queryClient.setQueryData<ChatMessage[]>(
        getListMessagesQueryKey(convIdForQuery),
        (old) => mergeMessagesIntoList(old, ev.message as ChatMessage),
      );
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
        }, 4500);
      } else {
        setPeerTyping(false);
        if (typingHideRef.current) {
          clearTimeout(typingHideRef.current);
          typingHideRef.current = null;
        }
      }
    }
  });

  useEffect(() => {
    if (!user || !conversationOk) return;
    wsSend({
      type: "conversation:focus",
      conversationId: conversationId,
      active: true,
    });
    return () =>
      wsSend({
        type: "conversation:focus",
        conversationId: conversationId,
        active: false,
      });
  }, [conversationId, conversationOk, user?.id, wsSend]);

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
    if (selectMode) {
      e.preventDefault();
      toggleSelected(m.id);
      return;
    }
    enterSelectWith(m.id);
  };

  const onDeleteSelectedForMe = () => {
    if (!selectedIds.size || !conversationOk) return;
    hideMessagesForMe.mutate(
      { convId: conversationId, data: { messageIds: [...selectedIds] } },
      {
        onSuccess: () => {
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

  /** مرة واحدة عند فتح المحادثة بعد وصول الرسائل — لا نربط التمرير بتغيّر messages بعد ذلك */
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [conversationId]);

  useLayoutEffect(() => {
    if (!conversationOk || !messages?.length || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    scrollToBottom();
  }, [conversationOk, messages, conversationId, scrollToBottom]);

  const peerActivityLabel = useMemo(() => {
    if (!messages?.length || !conv || !user) return null;
    let latestIso: string | null = null;
    for (const m of messages) {
      if (m.senderId !== conv.otherId) continue;
      if (!latestIso || new Date(m.createdAt) > new Date(latestIso)) {
        latestIso = m.createdAt;
      }
    }
    if (!latestIso) return null;
    const rel = formatRelativeTime(latestIso);
    if (!rel) return null;
    return t("message_thread.peer_last_message", { time: rel });
  }, [messages, conv, user, locale]);

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
        <Skeleton className="h-12 w-48 rounded-xl bg-zinc-900/70" />
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
      },
    );
  };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
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

  const busy = send.isPending || uploadBusy;
  const canSend = Boolean(body.trim() || pendingImageFile);

  const quickKeys = conv?.isSeller ? SELLER_QUICK_KEYS : BUYER_QUICK_KEYS;
  const dirRtl = locale === "ar";

  const appendQuick = (line: string) => {
    setBody((prev) => {
      const p = prev.trim();
      return p ? `${p}\n${line}` : line;
    });
  };

  const quickRepliesAr = conv?.isSeller
    ? SELLER_QUICK_REPLIES_AR
    : BUYER_QUICK_REPLIES_AR;
  const quickReplies = dirRtl ? [...quickRepliesAr] : quickKeys.map((key) => t(key));

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

  const renderRichText = (raw: string) => {
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
  };

  const renderDeliveryIcon = (m: ChatMessage) => {
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
    return (
      <Check className={`${iconClass} text-muted-foreground/70`} aria-hidden />
    );
  };

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A]"
      style={{ height: "100dvh" }}
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <header className="shrink-0 bg-[#0A0A0A] px-4 pb-2 pt-3 md:px-6">
        <div className="mx-auto w-full max-w-[820px] rounded-2xl border border-primary/35 bg-zinc-950 px-3 py-2.5 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.12),0_4px_20px_-12px_rgba(0,0,0,0.45)] ring-1 ring-primary/15">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (selectMode) exitSelectMode();
                  else navigate("/messages");
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/60 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-zinc-900/90 active:opacity-90"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              {conv?.adImage && conv?.adAvailable !== false ? (
                <Link
                  href={`/ad/${conv.adId}`}
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-zinc-900"
                >
                  <img src={conv.adImage} alt="" className="h-full w-full object-cover" />
                </Link>
              ) : (
                <div
                  className="h-11 w-11 shrink-0 rounded-xl border border-primary/25 bg-zinc-900"
                  title={
                    conv?.adAvailable === false
                      ? t("message_thread.menu_ad_unavailable")
                      : undefined
                  }
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">
                  {conv?.otherName || "..."}
                </div>
                {peerActivityLabel ? (
                  <p className="truncate text-[11px] leading-snug text-muted-foreground">
                    {peerActivityLabel}
                  </p>
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
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/35 bg-zinc-950 text-primary hover:bg-zinc-900"
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
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-zinc-950 text-primary hover:bg-zinc-900"
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
                <Skeleton className="h-[3.5rem] max-w-[75%] self-start rounded-2xl rounded-bl-md bg-zinc-900/70" />
                <Skeleton className="h-[3.5rem] max-w-[75%] self-end rounded-2xl rounded-br-md bg-zinc-900/70" />
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
              (messages ?? []).map((m: ChatMessage) => {
                const mine = m.senderId === user!.id;
                const plain = m.body ?? "";
                const msgKind = m.messageType === "image" ? "image" : "text";
                const isImageMsg = msgKind === "image" && Boolean(m.imageUrl);
                const showText = plain.trim().length > 0;
                const showBubbleContent = isImageMsg || showText;
                const isSelected = selectedIds.has(m.id);
                return (
                  <div
                    key={m.id}
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
                      onPointerDown={(e) => onMessagePointerDown(m, e)}
                      onPointerUp={onMessagePointerEnd}
                      onPointerCancel={onMessagePointerEnd}
                      onPointerLeave={onMessagePointerEnd}
                      onClick={(e) => onMessageClick(m, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!selectMode) enterSelectWith(m.id);
                          else toggleSelected(m.id);
                        }
                      }}
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
                        {!showBubbleContent ? (
                          <span className="text-sm text-zinc-400" aria-hidden>
                            —
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2">
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
                                />
                              </a>
                            ) : null}
                            {showText ? renderRichText(plain) : null}
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
                              {renderDeliveryIcon(m)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex w-full flex-col items-center justify-center py-12 text-sm text-zinc-500">
                {t("message_thread.empty_hint")}
              </div>
            )}
        </div>
        {selectMode ? (
        <div
          className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-primary/28 bg-[#0A0A0A] py-3 shadow-[0_-6px_28px_-10px_rgba(0,0,0,0.55)]"
          dir={dirRtl ? "rtl" : "ltr"}
        >
          <p className="min-w-0 text-sm font-medium text-zinc-200">
            {t("message_thread.select_count", { count: selectedIds.size })}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => exitSelectMode()}
              className="rounded-xl border border-primary/35 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_-12px_hsl(var(--primary)/0.15)] ring-1 ring-primary/10 transition-colors hover:border-primary/55 hover:bg-zinc-900"
            >
              {t("message_thread.select_cancel")}
            </button>
            <button
              type="button"
              disabled={!selectedIds.size || hideMessagesForMe.isPending}
              onClick={() => onDeleteSelectedForMe()}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/35 px-4 py-2.5 text-sm font-bold text-red-100 shadow-[0_0_18px_-12px_rgba(239,68,68,0.35)] transition-colors hover:border-red-500/55 hover:bg-red-950/50 disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              {hideMessagesForMe.isPending ? "…" : t("message_thread.select_delete")}
            </button>
          </div>
        </div>
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
          {peerTyping ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-primary/15 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.12)]"
              role="status"
              aria-live="polite"
            >
              <span className="flex gap-1" aria-hidden>
                <span className="h-1 w-1 animate-pulse rounded-full bg-primary/80" />
                <span
                  className="h-1 w-1 animate-pulse rounded-full bg-primary/60"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="h-1 w-1 animate-pulse rounded-full bg-primary/45"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
              <span>{t("message_thread.typing")}</span>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onImageSelected}
          />
          {pendingImagePreviewUrl ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-zinc-950 p-2 shadow-[0_0_14px_-12px_hsl(var(--primary)/0.14)]">
              <img
                src={pendingImagePreviewUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-primary/30 object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingImageFile(null)}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-zinc-900 px-3 text-[12px] font-medium text-primary hover:bg-primary/10"
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
                    onClick={() => appendQuick(line)}
                    className={QUICK_REPLY_CHIP}
                  >
                    {line}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end gap-2 rounded-full border border-primary/20 bg-[rgba(0,0,0,0.6)] px-3 py-2 shadow-[0_0_14px_-12px_hsl(var(--primary)/0.24)]">
            <textarea
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
              className="max-h-32 flex-1 resize-none bg-transparent px-0 py-0.5 text-sm text-white placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-zinc-950 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.35)] transition-[transform,box-shadow] hover:border-primary/65 hover:bg-zinc-900 active:scale-[0.98] disabled:opacity-50"
            aria-label={t("message_thread.attach_image")}
          >
            {uploadBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-5 w-5" aria-hidden />
            )}
          </button>
          <button
            type="submit"
            disabled={busy || !canSend}
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
    </div>
  );
}

import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  type Message as ChatMessage,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Check, CheckCheck, Send } from "lucide-react";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { formatMessageTimestamp, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * فقاعات — نفس نظام الكروت الداكنة؛ الفرق الوحيد: زاوية الذيل + وهج lime أخف جدًا للمرسل.
 */
const CHAT_RECV_OUTER =
  "relative overflow-hidden rounded-2xl rounded-bl-md border border-primary/15 bg-zinc-950/75 shadow-[0_4px_22px_-12px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.06] backdrop-blur-[2px]";

const CHAT_SENT_OUTER =
  "relative overflow-hidden rounded-2xl rounded-br-md border border-primary/18 bg-zinc-950/75 shadow-[0_0_20px_-18px_hsl(var(--primary)/0.07),0_4px_22px_-12px_rgba(0,0,0,0.42)] ring-1 ring-primary/10 backdrop-blur-[2px]";

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

const SELLER_QUICK_REPLIES_AR = [
  "نعم، المنتج متوفر",
  "السعر قابل للتفاوض بشكل بسيط",
  "يمكن الاستلام في [المدينة]",
  "الشحن متاح",
] as const;

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
  const convId = Number(params.id);
  const queryClient = useQueryClient();
  const send = useSendMessage();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  /** عند false لا نفرض التمرير لأسفل عند وصول رسائل جديدة (المستخدم يقرأ للأعلى). */
  const stickBottomRef = useRef(true);
  const typingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherUserIdRef = useRef<number | undefined>(undefined);
  const [peerTyping, setPeerTyping] = useState(false);

  const { data: conv } = useGetConversation(convId, {
    query: {
      queryKey: getGetConversationQueryKey(convId),
      enabled: !!user && !!convId,
    },
  });
  const { data: messages, isLoading } = useListMessages(convId, {
    query: {
      queryKey: getListMessagesQueryKey(convId),
      enabled: !!user && !!convId,
    },
  });

  otherUserIdRef.current = conv?.otherId;

  const { send: wsSend } = useChatSocket((ev) => {
    if (ev.type === "message" && ev.conversationId === convId) {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
      return;
    }
    if (
      ev.type === "typing" &&
      ev.conversationId === convId &&
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
    if (!user || !convId || !Number.isFinite(convId)) return;
    wsSend({ type: "conversation:focus", conversationId: convId, active: true });
    return () => wsSend({ type: "conversation:focus", conversationId: convId, active: false });
  }, [convId, user?.id, wsSend]);

  useEffect(() => {
    setPeerTyping(false);
    if (typingHideRef.current) {
      clearTimeout(typingHideRef.current);
      typingHideRef.current = null;
    }
  }, [convId]);

  useEffect(() => {
    return () => {
      if (typingHideRef.current) clearTimeout(typingHideRef.current);
    };
  }, []);

  const scrollToBottom = useCallback((force: boolean) => {
    if (force) stickBottomRef.current = true;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 96;
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickBottomRef.current = dist < threshold;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stickBottomRef.current) return;
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

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
    if (!convId) return;
    const qs = resolveSearchString(search);
    const paramsQs = new URLSearchParams(
      qs.startsWith("?") ? qs.slice(1) : qs,
    );
    const draftFromUrl = paramsQs.get("draft");
    const storageKey = messageDraftStorageKey(convId);

    if (draftFromUrl) {
      try {
        sessionStorage.setItem(storageKey, draftFromUrl);
      } catch {
        /* ignore quota / private mode */
      }
      setBody(draftFromUrl);
      navigate(`/messages/${convId}`, { replace: true });
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
  }, [convId, search, navigate]);

  if (!authLoading && !user) {
    const qs =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : "";
    return (
      <Redirect
        to={`/guest-welcome?redirect=${encodeURIComponent(`/messages/${convId}${qs}`)}`}
      />
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    send.mutate(
      { convId, data: { body: trimmed } },
      {
        onSuccess: () => {
          setBody("");
          scrollToBottom(true);
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
        },
      },
    );
  };

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

  const renderMessageBody = (raw: string) => {
    const text = raw || "";
    const linkTone =
      "rounded-xl border border-primary/15 bg-black/35 px-2.5 py-2 text-[11px] text-primary underline underline-offset-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] ring-1 ring-primary/8";
    const linkRegex = /(https?:\/\/[^\s]+|\/ad\/\d+)/g;
    const parts = text.split(linkRegex).filter(Boolean);
    const hasLink = parts.some((p) => linkRegex.test(p));
    linkRegex.lastIndex = 0;
    if (!hasLink) {
      return (
        <span
          dir={dirRtl ? "rtl" : "ltr"}
          className="block whitespace-pre-wrap break-words text-[14px] leading-relaxed text-zinc-100"
        >
          {text}
        </span>
      );
    }

    return (
      <div
        dir={dirRtl ? "rtl" : "ltr"}
        className="space-y-1.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-zinc-100"
      >
        {parts.map((part, idx) => {
          const isLink = /^(https?:\/\/[^\s]+|\/ad\/\d+)$/.test(part);
          if (!isLink) {
            return <p key={`${part}-${idx}`}>{part}</p>;
          }
          const href = part.startsWith("/ad/") ? part : part;
          return (
            <a
              key={`${part}-${idx}`}
              href={href}
              target={part.startsWith("http") ? "_blank" : undefined}
              rel={part.startsWith("http") ? "noreferrer" : undefined}
              className={`block ${linkTone}`}
              dir="ltr"
            >
              {part}
            </a>
          );
        })}
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
      className="fixed inset-0 z-0 flex h-[100svh] w-full flex-col overflow-hidden bg-[#0A0A0A]"
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-50 shrink-0 bg-[#0A0A0A]/95 px-4 pb-2 pt-3 backdrop-blur md:px-6">
        <div className="mx-auto w-full max-w-[820px] rounded-2xl border border-primary/35 bg-zinc-950/75 px-3 py-2.5 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.12),0_4px_20px_-12px_rgba(0,0,0,0.45)] ring-1 ring-primary/15 backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/60 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-zinc-900/90 active:opacity-90"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            {conv?.adImage ? (
              <Link
                href={`/ad/${conv.adId}`}
                className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-zinc-900"
              >
                <img src={conv.adImage} alt="" className="h-full w-full object-cover" />
              </Link>
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-xl border border-primary/25 bg-zinc-900" />
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
              {conv && (
                <Link
                  href={`/ad/${conv.adId}`}
                  className="block truncate text-xs text-zinc-400 hover:text-primary"
                >
                  {conv.adTitle}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+100px+8.75rem)] md:px-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-primary/35 bg-card/80 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 dark:bg-zinc-950/75">
          <div
            ref={scrollRef}
            className="flex max-h-full min-h-0 flex-col items-start gap-2 overflow-y-auto px-3 pb-5 pt-0"
          >
            {isLoading ? (
              <>
                <Skeleton className="h-[3.5rem] max-w-[75%] self-start rounded-2xl rounded-bl-md bg-zinc-900/70" />
                <Skeleton className="h-[3.5rem] max-w-[75%] self-end rounded-2xl rounded-br-md bg-zinc-900/70" />
              </>
            ) : messages && messages.length > 0 ? (
              messages.map((m: ChatMessage, index) => {
                const mine = m.senderId === user!.id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "min-w-0 max-w-[75%] transition-all duration-300 sm:max-w-[70%] md:max-w-[62%]",
                      mine ? `self-end ${CHAT_SENT_OUTER}` : `self-start ${CHAT_RECV_OUTER}`,
                    )}
                    style={{
                      opacity: 1,
                      transform: "translateY(0)",
                      animation: `messageIn 180ms ease ${index * 12}ms both`,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent"
                      aria-hidden
                    />
                    <div className="relative z-[1] px-3 pb-2 pt-2.5 md:px-3.5 md:pb-2.5 md:pt-3">
                      {renderMessageBody(m.body)}
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
                );
              })
            ) : (
              <div className="flex w-full flex-col items-center justify-center py-12 text-sm text-zinc-500">
                {t("message_thread.empty_hint")}
              </div>
            )}
          </div>

        </div>
      </div>
      <form
        onSubmit={handleSend}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+100px)] left-0 right-0 z-50 border-t border-primary/20 bg-[#0A0A0A]/95 px-3 py-2 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.65)] backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-2">
          {peerTyping ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-primary/15 bg-zinc-950/85 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.12)]"
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
          {conv && (
            <div className="scrollbar-thin mb-2 flex gap-2 overflow-x-auto rounded-xl border border-primary/20 bg-zinc-950/75 px-2 py-2">
              {quickReplies.map((line) => (
                <button
                  key={`fixed-${line}`}
                  type="button"
                  onClick={() => appendQuick(line)}
                  className="max-w-[240px] shrink-0 truncate whitespace-nowrap rounded-full border border-primary/30 bg-zinc-950/75 px-4 py-2 text-[13px] font-medium text-white shadow-[0_0_14px_-12px_hsl(var(--primary)/0.22)] transition-all duration-200 hover:border-primary/55 hover:bg-primary/15 active:scale-[0.97] active:border-primary/60"
                >
                  {line}
                </button>
              ))}
            </div>
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
            type="submit"
            disabled={send.isPending || !body.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_16px_-8px_hsl(var(--primary)/0.52)] transition-[transform,box-shadow] hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.62)] active:scale-[0.98] disabled:opacity-50"
            aria-label={t("message_thread.send")}
          >
            <Send className="h-5 w-5" />
          </button>
          </div>
        </div>
      </form>
      <style>{`
        @keyframes messageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

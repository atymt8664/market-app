import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Send } from "lucide-react";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/format";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

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
  const draftAppliedRef = useRef(false);

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

  useChatSocket((ev) => {
    if (ev.type === "message" && ev.conversationId === convId) {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!convId || draftAppliedRef.current) return;
    const paramsQs = new URLSearchParams(search);
    const draft = paramsQs.get("draft");
    if (!draft) return;
    draftAppliedRef.current = true;
    setBody(draft);
    navigate(`/messages/${convId}`, { replace: true });
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

  return (
    <div
      className="flex flex-col w-full min-h-[100dvh] bg-background"
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/messages")}
            className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{conv?.otherName || "..."}</div>
            {conv && (
              <Link
                href={`/ad/${conv.adId}`}
                className="text-xs text-muted-foreground truncate block hover:text-primary"
              >
                {conv.adTitle}
              </Link>
            )}
          </div>
          {conv?.adImage && (
            <Link
              href={`/ad/${conv.adId}`}
              className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
            >
              <img src={conv.adImage} alt="" className="w-full h-full object-cover" />
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 py-4 flex-1">
        <div className="rounded-2xl border border-border bg-card/70 h-[calc(100dvh-120px)] min-h-[520px] flex flex-col overflow-hidden">
          {conv &&
            conv.adPrice !== null &&
            typeof conv.adPriceType === "string" && (
            <Link
              href={`/ad/${conv.adId}`}
              className="px-4 py-2 text-xs text-primary border-b border-border/40 bg-primary/5"
            >
              {formatPrice(conv.adPrice, conv.adPriceType)}
            </Link>
            )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {isLoading ? (
              <>
                <Skeleton className="w-2/3 h-10 rounded-2xl self-start" />
                <Skeleton className="w-1/2 h-10 rounded-2xl self-end" />
              </>
            ) : messages && messages.length > 0 ? (
              messages.map((m) => {
                const mine = m.senderId === user!.id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      mine
                        ? "self-end bg-primary text-primary-foreground rounded-br-md"
                        : "self-start bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.body}
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                {t("message_thread.empty_hint")}
              </div>
            )}
          </div>

          {conv && (
            <div
              className="border-t border-border/60 bg-muted/20 px-2 py-2 flex gap-1.5 overflow-x-auto scrollbar-thin shrink-0"
              style={{
                paddingBottom: "calc(0.35rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {quickKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => appendQuick(t(key))}
                  className="shrink-0 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-foreground hover:bg-muted/80 active:scale-[0.98] transition-all whitespace-nowrap max-w-[200px] truncate"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="border-t border-border bg-background/80 p-2.5 flex gap-2 items-end"
            style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
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
              className="flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
            />
            <button
              type="submit"
              disabled={send.isPending || !body.trim()}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform shrink-0"
              aria-label={t("message_thread.send")}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

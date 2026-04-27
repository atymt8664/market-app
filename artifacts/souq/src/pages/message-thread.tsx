import { Link, Redirect, useLocation, useParams } from "wouter";
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

export default function MessageThread() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const convId = Number(params.id);
  const queryClient = useQueryClient();
  const send = useSendMessage();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  if (!authLoading && !user) return <Redirect to={`/login?redirect=/messages/${convId}`} />;

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

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 py-3 flex items-center gap-3">
          <button
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
          {conv && conv.adPrice !== null && conv.adPriceType !== null && (
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
                ابدأ المحادثة بإرسال رسالة
              </div>
            )}
          </div>

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
              placeholder="اكتب رسالة..."
              rows={1}
              className="flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
            />
            <button
              type="submit"
              disabled={send.isPending || !body.trim()}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform shrink-0"
              aria-label="إرسال"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

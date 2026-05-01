import { Link, Redirect } from "wouter";
import {
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!user,
    },
  });

  useChatSocket((ev) => {
    if (ev.type === "message") {
      queryClient.invalidateQueries({
        queryKey: getListConversationsQueryKey(),
      });
    }
  });

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/messages" />;

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 py-4">
          <h1 className="font-bold text-lg">{t("messages.title")}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[820px] px-4 md:px-6 py-4 flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-24 rounded-xl" />
            ))}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card/70 hover:bg-muted/40 active:bg-muted transition-colors"
                >
                  <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
                    {c.adImage ? (
                      <img
                        src={c.adImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold truncate">
                        {c.otherName || t("messages.user")}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatRelativeTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.adTitle}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        {c.lastMessagePreview || t("messages.start_chat")}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="ms-auto bg-primary text-primary-foreground rounded-full text-[10px] px-2 py-0.5 font-bold shrink-0 tabular-nums">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-border bg-card/60 py-14 px-6 mt-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold mb-1">{t("messages.empty_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("messages.empty_desc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

  if (!authLoading && !user) return <Redirect to="/login?redirect=/messages" />;

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4">
        <h1 className="font-bold text-lg">الرسائل</h1>
      </header>

      {isLoading ? (
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-16 rounded-xl" />
          ))}
        </div>
      ) : conversations && conversations.length > 0 ? (
        <ul className="flex flex-col">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 p-4 border-b border-border/40 hover:bg-muted/40 active:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {c.adImage ? (
                    <img
                      src={c.adImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold truncate">
                      {c.otherName || "مستخدم"}
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
                      {c.lastMessagePreview || "ابدأ المحادثة"}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground rounded-full text-[10px] px-2 py-0.5 font-bold shrink-0">
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
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center mt-12">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-1">لا توجد رسائل بعد</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            عندما تراسل بائعاً أو يُراسلك أحد على إعلانك ستظهر المحادثة هنا.
          </p>
        </div>
      )}
    </div>
  );
}

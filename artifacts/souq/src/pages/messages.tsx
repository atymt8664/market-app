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
import { cn } from "@/lib/utils";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-card/80 p-8 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 dark:bg-zinc-950/70 md:p-10";

const conversationRowClass =
  "flex items-center gap-3 rounded-2xl border border-primary/30 bg-zinc-950/75 p-3.5 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 transition-colors hover:border-primary/40 hover:bg-zinc-900/80 active:bg-zinc-900/90";

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
    <div className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      <header
        className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
        dir="rtl"
      >
        <div className="mx-auto w-full max-w-[820px] px-4 py-3.5 md:px-6">
          <h1 className="text-right text-lg font-bold text-foreground">
            {t("messages.title")}
          </h1>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-1 px-4 py-4 md:px-6">
        {isLoading ? (
          <div className="flex w-full flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-24 w-full rounded-2xl border border-primary/15 bg-zinc-900/80"
              />
            ))}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <ul className="flex w-full flex-col gap-2.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className={cn(conversationRowClass)}
                  dir="rtl"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-zinc-900">
                    {c.adImage ? (
                      <img
                        src={c.adImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/70">
                        <MessageCircle className="h-4 w-4" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">
                        {c.otherName || t("messages.user")}
                      </span>
                      <span className="shrink-0 text-[11px] text-primary/75 tabular-nums">
                        {formatRelativeTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.adTitle}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`truncate text-sm ${c.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        {c.lastMessagePreview || t("messages.start_chat")}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="ms-auto shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground shadow-[0_0_10px_-4px_hsl(var(--primary)/0.35)]">
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
          <div className="flex w-full justify-center pt-2">
            <div
              className={cn(
                emptyCardShell,
                "flex w-full max-w-md flex-col items-center text-center",
              )}
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-zinc-950/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
                <MessageCircle
                  className="h-8 w-8 text-primary"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </div>
              <h2 className="mb-1 text-base font-bold text-foreground">
                {t("messages.empty_title")}
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t("messages.empty_desc")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

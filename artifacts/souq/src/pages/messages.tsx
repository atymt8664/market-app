import { Link, Redirect } from "wouter";
import { memo, useCallback, useMemo, useState } from "react";
import {
  useListConversations,
  getListConversationsQueryKey,
  getAuthProfileCsrfTokenForRequest,
  normalizePresenceUserIds,
  useUserPresenceBatch,
  type ConversationListItem,
  type UserPresenceEntry,
} from "@workspace/api-client-react";
import { UserPresenceBadge } from "@/components/user-presence-badge";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { useChatSocket, type ChatSocketEvent } from "@/hooks/use-chat-socket";
import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { applyIncomingMessageToInboxCache } from "@/lib/inbox-conversation-cache";
import { STALE_CONVERSATIONS_MS } from "@/lib/query-stale-times";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/80 p-8 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 bg-[#0A0A0A]/70 md:p-10";

const conversationRowClass =
  "flex items-center gap-3 rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 p-3.5 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 transition-colors hover:border-primary/40 hover:bg-black/80 active:bg-black/90";

function areInboxListRowsEqual(a: ConversationListItem, b: ConversationListItem): boolean {
  return (
    a === b ||
    (a.id === b.id &&
      a.lastMessageAt === b.lastMessageAt &&
      (a.lastMessagePreview ?? "") === (b.lastMessagePreview ?? "") &&
      a.unreadCount === b.unreadCount &&
      a.otherName === b.otherName &&
      a.adTitle === b.adTitle &&
      (a.adImage ?? "") === (b.adImage ?? "") &&
      a.otherId === b.otherId)
  );
}

type MessagesInboxRowProps = {
  conversation: ConversationListItem;
  presenceEntry: UserPresenceEntry | undefined;
  presenceLoading: boolean;
  onPrefetchThread: (convId: number) => void;
};

const MessagesInboxRow = memo(
  function MessagesInboxRow({
    conversation: c,
    presenceEntry,
    presenceLoading,
    onPrefetchThread,
  }: MessagesInboxRowProps) {
    return (
      <li>
        <Link
          href={`/messages/${c.id}`}
          className={cn(conversationRowClass, "items-start")}
          dir="rtl"
          onPointerDown={() => onPrefetchThread(c.id)}
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-[#0A0A0A]">
            {c.adImage ? (
              <img
                src={c.adImage}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                sizes="44px"
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
            <div className="mt-1 w-full min-w-0">
              <UserPresenceBadge
                entry={presenceEntry}
                isLoading={presenceLoading}
                variant="compact"
              />
            </div>
            <div className="truncate text-xs text-muted-foreground">{c.adTitle}</div>
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
    );
  },
  (prev, next) =>
    areInboxListRowsEqual(prev.conversation, next.conversation) &&
    prev.presenceEntry === next.presenceEntry &&
    prev.presenceLoading === next.presenceLoading &&
    prev.onPrefetchThread === next.onPrefetchThread,
);

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: conversations, isLoading } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!user,
      staleTime: STALE_CONVERSATIONS_MS,
    },
  });
  type HiddenConversation = NonNullable<typeof conversations>[number];
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [hiddenRows, setHiddenRows] = useState<HiddenConversation[]>([]);
  const [unhidingId, setUnhidingId] = useState<number | null>(null);

  const visibleRows = useMemo(() => conversations ?? [], [conversations]);

  /**
   * سلسلة أولية (ليست useMemo بمرجع visibleRows) حتى لا يُعاد بناء قائمة presence
   * عند كل تحديث للكاش طالما أزواج (id, otherId) لم تتغير.
   */
  const inboxPresenceFingerprint = visibleRows.map((c) => `${c.id}:${c.otherId}`).join("|");

  const inboxPresenceTargets = useMemo(
    () =>
      normalizePresenceUserIds(
        visibleRows.map((c) => c.otherId).filter((id) => typeof id === "number" && id > 0),
      ),
    [inboxPresenceFingerprint],
  );

  const inboxPresenceQ = useUserPresenceBatch(inboxPresenceTargets, {
    enabled: Boolean(user) && inboxPresenceTargets.length > 0,
  });

  const loadHiddenConversations = async () => {
    setHiddenLoading(true);
    try {
      const res = await fetch(apiUrl("/api/conversations/hidden"), {
        credentials: "include",
      });
      if (!res.ok) {
        setHiddenRows([]);
        return;
      }
      const data = (await res.json()) as HiddenConversation[];
      setHiddenRows(Array.isArray(data) ? data : []);
    } catch {
      setHiddenRows([]);
    } finally {
      setHiddenLoading(false);
    }
  };

  const unhideConversation = async (convId: number) => {
    setUnhidingId(convId);
    try {
      const csrf = getAuthProfileCsrfTokenForRequest();
      const headers =
        typeof csrf === "string" && csrf.length >= 32 ? { "X-CSRF-Token": csrf } : undefined;
      const res = await fetch(apiUrl(`/api/conversations/${convId}/unhide-for-me`), {
        method: "POST",
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        toast({
          title: t("messages.hidden_unhide_failed"),
          variant: "destructive",
        });
        return;
      }
      setHiddenRows((prev) => prev.filter((row) => row.id !== convId));
      await queryClient.invalidateQueries({
        queryKey: getListConversationsQueryKey(),
      });
    } finally {
      setUnhidingId(null);
    }
  };

  const prefetchThread = useCallback(
    (convId: number) => {
      void prefetchConversationThread(queryClient, convId);
    },
    [queryClient],
  );

  const onInboxChatSocketEvent = useCallback(
    (ev: ChatSocketEvent) => {
      if (ev.type === "message" && user?.id) {
        applyIncomingMessageToInboxCache(queryClient, {
          myUserId: user.id,
          conversationId: ev.conversationId,
          message: ev.message,
        });
      }
    },
    [queryClient, user?.id],
  );

  useChatSocket(onInboxChatSocketEvent);

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/messages" />;

  return (
    <div className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      <header
        className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
        dir="rtl"
      >
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <h1 className="text-right text-lg font-bold text-foreground">{t("messages.title")}</h1>
          <button
            type="button"
            onClick={() => {
              setHiddenOpen(true);
              void loadHiddenConversations();
            }}
            className="inline-flex shrink-0 items-center rounded-xl border border-primary/35 bg-[#0A0A0A]/85 px-3 py-1.5 text-[12px] font-semibold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 transition-colors hover:border-primary/52 hover:bg-black/95"
          >
            {t("messages.hidden_open")}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-1 px-4 py-4 md:px-6">
        {isLoading ? (
          <div className="flex w-full flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-24 w-full rounded-2xl border border-primary/15 bg-[#0A0A0A]/80"
              />
            ))}
          </div>
        ) : visibleRows && visibleRows.length > 0 ? (
          <ul className="flex w-full flex-col gap-2.5">
            {visibleRows.map((c) => (
              <MessagesInboxRow
                key={c.id}
                conversation={c}
                presenceEntry={inboxPresenceQ.data?.byUserId[String(c.otherId)]}
                presenceLoading={inboxPresenceQ.isPending}
                onPrefetchThread={prefetchThread}
              />
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
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A]/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
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

      <Sheet
        open={hiddenOpen}
        onOpenChange={(next) => {
          setHiddenOpen(next);
        }}
      >
        <SheetContent
          side="bottom"
          hideClose
          className="flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4">
            <SheetTitle className="m-0 flex-1 text-center text-base font-semibold text-white">
              {t("messages.hidden_title")}
            </SheetTitle>
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t("messages.hidden_close")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30"
              >
                ✕
              </button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">{t("messages.hidden_title")}</SheetDescription>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {hiddenLoading ? (
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-24 w-full rounded-2xl border border-primary/15 bg-[#0A0A0A]/80"
                  />
                ))}
              </div>
            ) : hiddenRows.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {hiddenRows.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-primary/30 bg-[#0A0A0A]/85 p-3.5 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10"
                  >
                    <div className="flex items-center gap-3" dir="rtl">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-[#0A0A0A]">
                        {c.adImage ? (
                          <img
                            src={c.adImage}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            sizes="44px"
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
                        <div className="truncate text-xs text-muted-foreground">{c.adTitle}</div>
                        <div className="truncate text-sm text-muted-foreground">
                          {c.lastMessagePreview || t("messages.start_chat")}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={unhidingId === c.id}
                      onClick={() => void unhideConversation(c.id)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/12 py-2 text-sm font-semibold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.3)] transition-colors hover:bg-primary/18 disabled:opacity-45"
                    >
                      {unhidingId === c.id ? "…" : t("messages.hidden_unhide")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex w-full flex-col items-center justify-center py-12 text-sm text-zinc-500">
                {t("messages.hidden_empty")}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

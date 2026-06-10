import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  getAuthProfileCsrfTokenForRequest,
  getListConversationsQueryKey,
  type ConversationListItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, BellOff, ListX, MessageCircle, User } from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import { ChatInboxCollectionShell } from "@/components/chat-inbox-collection-shell";
import {
  inboxBlockedQueryKey,
  inboxHiddenQueryKey,
  useInboxBlockedUsers,
  useInboxHiddenConversations,
} from "@/hooks/use-inbox-collections";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/format";
import { apiUrl } from "@/lib/api-url";
import type { BlockedUserListItem } from "@/lib/chat-inbox-collections-api";
import {
  inboxCollectionActionBtn,
  inboxCollectionRowCard,
  inboxCollectionSecondaryBtn,
  inboxCollectionThumbClass,
  inboxCollectionUnblockBtn,
} from "@/lib/chat-inbox-collection-styles";
import { t } from "@/i18n";
import { appTextAlignClass, getAppTextDir } from "@/lib/app-text-direction";
import { cn } from "@/lib/utils";

const collectionActionRowClass = "mt-1.5 flex gap-1.5";

function ConversationThumb({ conversation: c }: { conversation: ConversationListItem }) {
  return (
    <div className={inboxCollectionThumbClass}>
      {c.adImage ? (
        <img
          src={c.adImage}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          sizes="36px"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/70">
          <MessageCircle className="h-3 w-3" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

function ConversationSummary({ conversation: c }: { conversation: ConversationListItem }) {
  const textDir = getAppTextDir();
  const textAlign = appTextAlignClass();
  return (
    <div className={cn("min-w-0 flex-1", textAlign)} dir={textDir}>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5">
        <span
          className={cn(
            "block min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground",
            textAlign,
          )}
        >
          {c.otherName || t("messages.user")}
        </span>
        <span className="shrink-0 text-[9px] leading-none text-primary/60 tabular-nums">
          {formatRelativeTime(c.lastMessageAt)}
        </span>
      </div>
      <div
        className={cn(
          "block min-w-0 truncate text-[9px] leading-tight text-muted-foreground/70",
          textAlign,
        )}
      >
        {c.adTitle}
      </div>
      <div
        className={cn(
          "block min-w-0 truncate text-[12px] leading-snug text-muted-foreground/85",
          textAlign,
        )}
      >
        {c.lastMessagePreview || t("messages.start_chat")}
      </div>
    </div>
  );
}

type HiddenCollectionProps = {
  enabled: boolean;
  onBack: () => void;
};

export function ChatInboxHiddenCollection({ enabled, onBack }: HiddenCollectionProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const textDir = getAppTextDir();
  const [unhidingId, setUnhidingId] = useState<number | null>(null);
  const { data: rows = [], isPending, isFetching } = useInboxHiddenConversations(enabled);

  const loading = isPending && rows.length === 0;
  const empty = !isPending && rows.length === 0;

  const unhideConversation = useCallback(
    async (convId: number) => {
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
          toast({ title: t("p5.chat.collections.hidden_unhide_failed"), variant: "destructive" });
          return;
        }
        queryClient.setQueryData<ConversationListItem[]>(inboxHiddenQueryKey(), (prev) =>
          (prev ?? []).filter((row) => row.id !== convId),
        );
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        toast({ title: t("p5.chat.collections.hidden_unhide_success") });
      } finally {
        setUnhidingId(null);
      }
    },
    [queryClient, toast],
  );

  return (
    <ChatInboxCollectionShell
      title={t("p5.chat.collections.hidden_title")}
      count={rows.length}
      loading={loading || (isFetching && rows.length === 0)}
      empty={empty}
      emptyIcon={<ListX className="h-7 w-7 text-primary" strokeWidth={2.25} aria-hidden />}
      emptyTitle={t("p5.chat.collections.hidden_empty_title")}
      emptyDesc={t("p5.chat.collections.hidden_empty_desc")}
      onBack={onBack}
    >
      {rows.map((c) => (
        <article key={c.id} className={inboxCollectionRowCard}>
          <button
            type="button"
            className={cn("flex w-full items-center gap-2", appTextAlignClass())}
            dir={textDir}
            onClick={() => navigate(`/messages/${c.id}`)}
          >
            <ConversationThumb conversation={c} />
            <ConversationSummary conversation={c} />
          </button>
          <div className={collectionActionRowClass} dir={textDir}>
            <button
              type="button"
              disabled={unhidingId === c.id}
              onClick={() => void unhideConversation(c.id)}
              className={inboxCollectionActionBtn}
            >
              {unhidingId === c.id ? "…" : t("p5.chat.collections.hidden_unhide")}
            </button>
          </div>
        </article>
      ))}
    </ChatInboxCollectionShell>
  );
}

type BlockedCollectionProps = {
  enabled: boolean;
  onBack: () => void;
};

export function ChatInboxBlockedCollection({ enabled, onBack }: BlockedCollectionProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const textDir = getAppTextDir();
  const textAlign = appTextAlignClass();
  const [unblockingId, setUnblockingId] = useState<number | null>(null);
  const { data: rows = [], isPending, isFetching, refetch } = useInboxBlockedUsers(enabled, {
    live: true,
  });

  useEffect(() => {
    if (!enabled) return;
    void queryClient.invalidateQueries({ queryKey: inboxBlockedQueryKey() });
    void refetch();
  }, [enabled, queryClient, refetch]);

  const loading = isPending && rows.length === 0;
  const empty = !isPending && rows.length === 0;

  const unblockUser = useCallback(
    async (userId: number) => {
      setUnblockingId(userId);
      try {
        const csrf = getAuthProfileCsrfTokenForRequest();
        const headers: Record<string, string> =
          typeof csrf === "string" && csrf.length >= 32 ? { "X-CSRF-Token": csrf } : {};
        const res = await fetch(apiUrl(`/api/users/${userId}/block`), {
          method: "DELETE",
          credentials: "include",
          headers,
        });
        if (!res.ok) {
          toast({ title: t("p5.chat.collections.blocked_unblock_failed"), variant: "destructive" });
          return;
        }
        queryClient.setQueryData<BlockedUserListItem[]>(inboxBlockedQueryKey(), (prev) =>
          (prev ?? []).filter((row) => row.id !== userId),
        );
        toast({ title: t("p5.chat.collections.blocked_unblock_success") });
      } finally {
        setUnblockingId(null);
      }
    },
    [queryClient, toast],
  );

  return (
    <ChatInboxCollectionShell
      title={t("p5.chat.collections.blocked_title")}
      count={rows.length}
      loading={loading || (isFetching && rows.length === 0)}
      empty={empty}
      emptyIcon={<Ban className="h-7 w-7 text-primary" strokeWidth={2.25} aria-hidden />}
      emptyTitle={t("p5.chat.collections.blocked_empty_title")}
      emptyDesc={t("p5.chat.collections.blocked_empty_desc")}
      onBack={onBack}
    >
      {rows.map((u) => (
        <article key={u.id} className={inboxCollectionRowCard}>
          <div className="flex items-center gap-2" dir={textDir}>
            <AvatarCircle name={u.name} src={u.avatarUrl} size={36} />
            <div className={cn("min-w-0 flex-1", textAlign)}>
              <div className={cn("block min-w-0 truncate text-[13px] font-semibold text-foreground", textAlign)}>
                {u.name || t("messages.user")}
              </div>
              {u.city ? (
                <div className={cn("block min-w-0 truncate text-[10px] text-muted-foreground/75", textAlign)}>
                  {u.city}
                </div>
              ) : null}
            </div>
          </div>
          <div className={collectionActionRowClass} dir={textDir}>
            <button
              type="button"
              onClick={() => navigate(`/users/${u.id}`)}
              className={inboxCollectionSecondaryBtn}
            >
              <User className="ms-1 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              {t("p5.chat.collections.blocked_open_profile")}
            </button>
            <button
              type="button"
              disabled={unblockingId === u.id}
              onClick={() => void unblockUser(u.id)}
              className={inboxCollectionUnblockBtn}
            >
              {unblockingId === u.id ? "…" : t("p5.chat.collections.blocked_unblock")}
            </button>
          </div>
        </article>
      ))}
    </ChatInboxCollectionShell>
  );
}

type MutedCollectionProps = {
  rows: ConversationListItem[];
  mutedIds: readonly number[];
  onUnmute: (convId: number) => void;
  onBack: () => void;
};

export function ChatInboxMutedCollection({
  rows,
  mutedIds,
  onUnmute,
  onBack,
  loading = false,
}: MutedCollectionProps & { loading?: boolean }) {
  const [, navigate] = useLocation();
  const textDir = getAppTextDir();
  const mutedRows = useMemo(() => {
    const mutedSet = new Set(mutedIds);
    return rows
      .filter((c) => mutedSet.has(c.id))
      .sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
  }, [mutedIds, rows]);

  const empty = !loading && mutedRows.length === 0;

  return (
    <ChatInboxCollectionShell
      title={t("p5.chat.collections.muted_title")}
      count={mutedRows.length}
      loading={loading}
      empty={empty}
      emptyIcon={<BellOff className="h-7 w-7 text-primary" strokeWidth={2.25} aria-hidden />}
      emptyTitle={t("p5.chat.collections.muted_empty_title")}
      emptyDesc={t("p5.chat.collections.muted_empty_desc")}
      onBack={onBack}
    >
      {mutedRows.map((c) => (
        <article key={c.id} className={inboxCollectionRowCard}>
          <button
            type="button"
            className={cn("flex w-full items-center gap-2", appTextAlignClass())}
            dir={textDir}
            onClick={() => navigate(`/messages/${c.id}`)}
          >
            <ConversationThumb conversation={c} />
            <ConversationSummary conversation={c} />
          </button>
          <div className={collectionActionRowClass} dir={textDir}>
            <button type="button" onClick={() => onUnmute(c.id)} className={inboxCollectionActionBtn}>
              {t("p5.chat.collections.muted_unmute")}
            </button>
          </div>
        </article>
      ))}
    </ChatInboxCollectionShell>
  );
}

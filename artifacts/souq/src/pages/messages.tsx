import { Redirect, useLocation } from "wouter";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import {
  useListConversations,
  getListConversationsQueryKey,
  normalizePresenceUserIds,
  useUserPresenceBatch,
  useHideConversationForMe,
  type ConversationListItem,
  type UserPresenceEntry,
} from "@workspace/api-client-react";
import { ChatInboxActionSheet } from "@/components/chat-inbox-action-sheet";
import { ChatInboxConfirmDialog } from "@/components/chat-inbox-confirm-dialog";
import { ChatInboxPresenceLine } from "@/components/chat-inbox-presence-line";
import { ChatInboxSelectionHeader } from "@/components/chat-inbox-selection-header";
import { useAuth } from "@/hooks/use-auth";
import { useInboxClientPrefs } from "@/hooks/use-inbox-client-prefs";
import { useInboxLongPress } from "@/hooks/use-inbox-long-press";
import { Skeleton } from "@/components/ui/skeleton";
import { BellOff, Check, MessageCircle, Pin } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { useChatSocket, type ChatSocketEvent } from "@/hooks/use-chat-socket";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
  BOTTOM_NAV_SCROLL_END_SPACER_CLASS,
} from "@/lib/bottom-nav-layout";
import {
  ChatInboxCollectionsMenu,
  ChatInboxCollectionsMenuButton,
  type InboxCollectionKind,
} from "@/components/chat-inbox-collections-menu";
import {
  ChatInboxBlockedCollection,
  ChatInboxHiddenCollection,
  ChatInboxMutedCollection,
} from "@/components/chat-inbox-collection-screens";
import {
  inboxBlockedQueryKey,
  inboxHiddenQueryKey,
  useInboxBlockedUsers,
  useInboxHiddenConversations,
} from "@/hooks/use-inbox-collections";
import { useToast } from "@/hooks/use-toast";
import { sortInboxRowsWithPrefs } from "@/lib/chat-inbox-client-prefs";
import {
  applyIncomingMessageToInboxCache,
  removeConversationsFromInboxCache,
} from "@/lib/inbox-conversation-cache";
import { STALE_CONVERSATIONS_MS } from "@/lib/query-stale-times";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import {
  appInlineStartJustifyClass,
  appTextAlignClass,
  getAppTextDir,
} from "@/lib/app-text-direction";
import { inboxCollectionPageTitleBadge } from "@/lib/chat-inbox-collection-styles";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/80 p-8 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 bg-[#0A0A0A]/70 md:p-10";

const conversationRowBaseClass =
  "flex w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-[#0A0A0A]/75 px-2.5 py-2 shadow-[0_0_12px_-10px_hsl(var(--primary)/0.1)] ring-1 ring-primary/10 transition-colors";

const conversationRowInteractiveClass =
  "hover:border-primary/40 hover:bg-black/80 active:bg-black/90";

/** Blocks native link/image callout menus on mobile long-press. */
const inboxRowTouchGuardClass =
  "select-none [-webkit-touch-callout:none] [touch-action:manipulation] [-webkit-user-drag:none]";

function blockNativeRowContextMenu(e: SyntheticEvent) {
  e.preventDefault();
}

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

function InboxRowBody({
  conversation: c,
  presenceEntry,
  presenceLoading,
  isPinned,
  isMuted,
}: {
  conversation: ConversationListItem;
  presenceEntry: UserPresenceEntry | undefined;
  presenceLoading: boolean;
  isPinned: boolean;
  isMuted: boolean;
}) {
  const textAlign = appTextAlignClass();
  const rowHeadJustify = appInlineStartJustifyClass();
  return (
    <>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-[#0A0A0A]">
        {c.adImage ? (
          <img
            src={c.adImage}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            draggable={false}
            sizes="40px"
            onContextMenu={blockNativeRowContextMenu}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/70">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        )}
      </div>
      <div className={cn("min-w-0 flex-1", textAlign)} dir={getAppTextDir()}>
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
          <div className={cn("flex min-w-0 items-center gap-1", rowHeadJustify)}>
            {isPinned ? (
              <Pin className="h-3 w-3 shrink-0 text-primary/85" strokeWidth={2.25} aria-hidden />
            ) : null}
            {isMuted ? (
              <BellOff className="h-3 w-3 shrink-0 text-zinc-500" strokeWidth={2.25} aria-hidden />
            ) : null}
            <span
              className={cn(
                "block min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground",
                textAlign,
              )}
            >
              {c.otherName || t("messages.user")}
            </span>
          </div>
          <span className="shrink-0 text-[10px] leading-none text-primary/60 tabular-nums">
            {formatRelativeTime(c.lastMessageAt)}
          </span>
        </div>
        <ChatInboxPresenceLine
          entry={presenceEntry}
          isLoading={presenceLoading}
          adTitle={c.adTitle}
          className={textAlign}
        />
        <div className="mt-px grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5">
          <span
            className={cn(
              "block min-w-0 truncate text-[13px] leading-snug",
              textAlign,
              c.unreadCount > 0
                ? "font-medium text-foreground"
                : "text-muted-foreground/85",
            )}
          >
            {c.lastMessagePreview || t("messages.start_chat")}
          </span>
          {c.unreadCount > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none tabular-nums text-primary-foreground shadow-[0_0_8px_-4px_hsl(var(--primary)/0.35)]">
              {c.unreadCount > 99 ? "99+" : c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

type MessagesInboxRowProps = {
  conversation: ConversationListItem;
  presenceEntry: UserPresenceEntry | undefined;
  presenceLoading: boolean;
  selectMode: boolean;
  isSelected: boolean;
  isPinned: boolean;
  isMuted: boolean;
  onPrefetchThread: (convId: number) => void;
  onRowPointerDown: (convId: number) => void;
  onRowPointerEnd: () => void;
  onToggleSelect: (convId: number) => void;
  onConsumeLongPress: () => boolean;
  onOpenConversation: (convId: number) => void;
};

const MessagesInboxRow = memo(
  function MessagesInboxRow({
    conversation: c,
    presenceEntry,
    presenceLoading,
    selectMode,
    isSelected,
    isPinned,
    isMuted,
    onPrefetchThread,
    onRowPointerDown,
    onRowPointerEnd,
    onToggleSelect,
    onConsumeLongPress,
    onOpenConversation,
  }: MessagesInboxRowProps) {
    const rowClass = cn(
      conversationRowBaseClass,
      appTextAlignClass(),
      inboxRowTouchGuardClass,
      !selectMode && conversationRowInteractiveClass,
      "cursor-pointer",
      selectMode &&
        isSelected &&
        "border-primary/55 bg-primary/[0.07] ring-primary/35 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.22)]",
    );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (selectMode) onToggleSelect(c.id);
      else onOpenConversation(c.id);
    };

    const onRowClick = (e: MouseEvent) => {
      if (onConsumeLongPress()) {
        e.preventDefault();
        return;
      }
      if (selectMode) {
        onToggleSelect(c.id);
        return;
      }
      onOpenConversation(c.id);
    };

    const selectionMark = selectMode ? (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-zinc-600 bg-transparent",
        )}
        aria-hidden
      >
        {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
    ) : null;

    return (
      <li>
        <button
          type="button"
          className={rowClass}
          dir={getAppTextDir()}
          aria-pressed={selectMode ? isSelected : undefined}
          aria-label={c.otherName || t("messages.user")}
          onContextMenu={blockNativeRowContextMenu}
          onPointerDown={() => {
            onRowPointerDown(c.id);
            if (!selectMode) onPrefetchThread(c.id);
          }}
          onPointerUp={onRowPointerEnd}
          onPointerCancel={onRowPointerEnd}
          onPointerLeave={onRowPointerEnd}
          onClick={onRowClick}
          onKeyDown={onKeyDown}
        >
          {selectionMark}
          <InboxRowBody
            conversation={c}
            presenceEntry={presenceEntry}
            presenceLoading={presenceLoading}
            isPinned={isPinned}
            isMuted={isMuted}
          />
        </button>
      </li>
    );
  },
  (prev, next) =>
    areInboxListRowsEqual(prev.conversation, next.conversation) &&
    prev.presenceEntry === next.presenceEntry &&
    prev.presenceLoading === next.presenceLoading &&
    prev.selectMode === next.selectMode &&
    prev.isSelected === next.isSelected &&
    prev.isPinned === next.isPinned &&
    prev.isMuted === next.isMuted &&
    prev.onPrefetchThread === next.onPrefetchThread &&
    prev.onRowPointerDown === next.onRowPointerDown &&
    prev.onRowPointerEnd === next.onRowPointerEnd &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onConsumeLongPress === next.onConsumeLongPress &&
    prev.onOpenConversation === next.onOpenConversation,
);

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: conversations, isPending, isFetching, isError } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: !!user,
      staleTime: STALE_CONVERSATIONS_MS,
      placeholderData: keepPreviousData,
    },
  });
  const [collectionsMenuOpen, setCollectionsMenuOpen] = useState(false);
  const [collectionView, setCollectionView] = useState<InboxCollectionKind | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [actionSheetConvId, setActionSheetConvId] = useState<number | null>(null);
  const [actionsBusy, setActionsBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: "hide" | "delete";
    ids: number[];
  } | null>(null);

  const hideConversationMutation = useHideConversationForMe();
  const { pinnedSet, mutedSet, togglePin, toggleMute, applyPin, applyMute, prefs } =
    useInboxClientPrefs(user?.id);

  const collectionsPrefetchEnabled = Boolean(user) && !authLoading;
  const hiddenQ = useInboxHiddenConversations(collectionsPrefetchEnabled);
  const blockedQ = useInboxBlockedUsers(collectionsPrefetchEnabled);

  const hiddenCount = hiddenQ.data?.length ?? 0;
  const blockedCount = blockedQ.data?.length ?? 0;
  const mutedCount = useMemo(() => {
    const mutedSet = new Set(prefs.mutedIds);
    return (conversations ?? []).filter((c) => mutedSet.has(c.id)).length;
  }, [conversations, prefs.mutedIds]);

  const visibleRows = useMemo(
    () => sortInboxRowsWithPrefs(conversations ?? [], prefs),
    [conversations, prefs],
  );

  const conversationCount = conversations?.length ?? 0;
  const inboxHydrating =
    authLoading || (!!user && isPending && conversationCount === 0);
  const showInboxList = conversationCount > 0;
  const showInboxEmpty = !!user && !authLoading && !isPending && conversationCount === 0;

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const enterSelectWith = useCallback((convId: number) => {
    setSelectMode(true);
    setSelectedIds(new Set([convId]));
  }, []);

  const toggleSelected = useCallback((convId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set(visibleRows.map((c) => c.id)));
  }, [visibleRows]);

  const openActionSheet = useCallback((convId: number) => {
    setActionSheetConvId(convId);
  }, []);

  const { onRowPointerDown, onRowPointerEnd, consumeLongPress } = useInboxLongPress({
    selectMode,
    onLongPress: openActionSheet,
  });

  const actionSheetConversation = useMemo(
    () => visibleRows.find((c) => c.id === actionSheetConvId) ?? null,
    [actionSheetConvId, visibleRows],
  );

  const runHideConversations = useCallback(
    async (ids: number[], successKey: "p5.chat.inbox.hide_success" | "p5.chat.inbox.delete_success") => {
      if (ids.length === 0) return;
      setActionsBusy(true);
      removeConversationsFromInboxCache(queryClient, ids);
      try {
        await Promise.all(ids.map((id) => hideConversationMutation.mutateAsync({ convId: id })));
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t(successKey) });
        setActionSheetConvId(null);
        exitSelectMode();
      } catch {
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t("p5.chat.inbox.hide_failed"), variant: "destructive" });
      } finally {
        setActionsBusy(false);
        setPendingConfirm(null);
      }
    },
    [exitSelectMode, hideConversationMutation, queryClient, toast],
  );

  const requestHide = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setActionSheetConvId(null);
    setPendingConfirm({ kind: "hide", ids });
  }, []);

  const requestDelete = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setActionSheetConvId(null);
    setPendingConfirm({ kind: "delete", ids });
  }, []);

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  const runPinOnSelected = useCallback(() => {
    if (selectedIdList.length === 0) return;
    const allPinned = selectedIdList.every((id) => pinnedSet.has(id));
    applyPin(selectedIdList, !allPinned);
  }, [applyPin, pinnedSet, selectedIdList]);

  const runMuteOnSelected = useCallback(() => {
    if (selectedIdList.length === 0) return;
    const allMuted = selectedIdList.every((id) => mutedSet.has(id));
    applyMute(selectedIdList, !allMuted);
  }, [applyMute, mutedSet, selectedIdList]);

  useEffect(() => {
    if (visibleRows.length === 0 && selectMode) {
      exitSelectMode();
    }
  }, [exitSelectMode, selectMode, visibleRows.length]);

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

  const prefetchThread = useCallback(
    (convId: number) => {
      if (selectMode) return;
      void prefetchConversationThread(queryClient, convId);
    },
    [queryClient, selectMode],
  );

  const openConversation = useCallback(
    (convId: number) => {
      if (selectMode) return;
      navigate(`/messages/${convId}`);
    },
    [navigate, selectMode],
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

  if (collectionView === "hidden") {
    return <ChatInboxHiddenCollection enabled onBack={() => setCollectionView(null)} />;
  }

  if (collectionView === "blocked") {
    return <ChatInboxBlockedCollection enabled onBack={() => setCollectionView(null)} />;
  }

  if (collectionView === "muted") {
    return (
      <ChatInboxMutedCollection
        rows={conversations ?? []}
        mutedIds={prefs.mutedIds}
        loading={isPending}
        onUnmute={toggleMute}
        onBack={() => setCollectionView(null)}
      />
    );
  }

  return (
    <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
      {selectMode ? (
        <ChatInboxSelectionHeader
          selectedCount={selectedIds.size}
          totalCount={visibleRows.length}
          actionsDisabled={actionsBusy}
          onSelectAll={selectAll}
          onClearSelection={exitSelectMode}
          onPin={runPinOnSelected}
          onMute={runMuteOnSelected}
          onHide={() => requestHide(selectedIdList)}
          onDelete={() => requestDelete(selectedIdList)}
        />
      ) : (
        <header
          className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A] shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
          dir={getAppTextDir()}
        >
          <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-3 py-2.5 md:px-4">
            <h1 className={cn("m-0 min-w-0 flex-1", appTextAlignClass())}>
              <span className={inboxCollectionPageTitleBadge}>{t("messages.title")}</span>
            </h1>
            <ChatInboxCollectionsMenuButton
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: inboxBlockedQueryKey() });
                void queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
                setCollectionsMenuOpen(true);
              }}
            />
          </div>
        </header>
      )}

      <div className="mx-auto flex w-full max-w-[820px] flex-1 px-4 py-3 md:px-6">
        {inboxHydrating ? (
          <div className="flex w-full flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[70px] w-full rounded-xl border border-primary/15 bg-[#0A0A0A]/80"
              />
            ))}
          </div>
        ) : showInboxList ? (
          <ul className="flex w-full flex-col gap-1.5">
            {visibleRows.map((c) => (
              <MessagesInboxRow
                key={c.id}
                conversation={c}
                presenceEntry={inboxPresenceQ.data?.byUserId[String(c.otherId)]}
                presenceLoading={inboxPresenceQ.isPending}
                selectMode={selectMode}
                isSelected={selectedIds.has(c.id)}
                isPinned={pinnedSet.has(c.id)}
                isMuted={mutedSet.has(c.id)}
                onPrefetchThread={prefetchThread}
                onRowPointerDown={onRowPointerDown}
                onRowPointerEnd={onRowPointerEnd}
                onToggleSelect={toggleSelected}
                onConsumeLongPress={consumeLongPress}
                onOpenConversation={openConversation}
              />
            ))}
            <li aria-hidden className={cn(BOTTOM_NAV_SCROLL_END_SPACER_CLASS, "list-none")} />
          </ul>
        ) : isError ? (
          <div className="flex w-full flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-red-300">{t("messages.load_error")}</p>
            <button
              type="button"
              onClick={() => void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() })}
              className="rounded-full border border-primary/40 bg-primary/15 px-5 py-2 text-sm font-medium text-primary hover:bg-primary/25"
            >
              {t("message_thread.retry")}
            </button>
          </div>
        ) : showInboxEmpty ? (
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
        ) : isFetching ? (
          <div className="flex w-full flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[70px] w-full rounded-xl border border-primary/15 bg-[#0A0A0A]/80"
              />
            ))}
          </div>
        ) : null}
      </div>

      <ChatInboxActionSheet
        open={actionSheetConvId != null}
        peerName={actionSheetConversation?.otherName ?? ""}
        isPinned={actionSheetConvId != null && pinnedSet.has(actionSheetConvId)}
        isMuted={actionSheetConvId != null && mutedSet.has(actionSheetConvId)}
        busy={actionsBusy}
        onOpenChange={(next) => {
          if (!next) setActionSheetConvId(null);
        }}
        onPin={() => {
          if (actionSheetConvId == null) return;
          togglePin(actionSheetConvId);
        }}
        onMute={() => {
          if (actionSheetConvId == null) return;
          toggleMute(actionSheetConvId);
        }}
        onHide={() => {
          if (actionSheetConvId == null) return;
          requestHide([actionSheetConvId]);
        }}
        onDelete={() => {
          if (actionSheetConvId == null) return;
          requestDelete([actionSheetConvId]);
        }}
        onEnterSelection={() => {
          if (actionSheetConvId == null) return;
          const id = actionSheetConvId;
          setActionSheetConvId(null);
          enterSelectWith(id);
        }}
      />

      <ChatInboxConfirmDialog
        open={pendingConfirm?.kind === "hide"}
        title={t("p5.chat.inbox.hide_confirm_title")}
        description={t("p5.chat.inbox.hide_confirm_desc", {
          count: pendingConfirm?.ids.length ?? 0,
        })}
        confirmLabel={t("p5.chat.inbox.hide_confirm_cta")}
        cancelLabel={t("message_thread.hide_confirm_cancel")}
        busy={actionsBusy}
        onConfirm={() => {
          if (pendingConfirm?.kind === "hide") {
            void runHideConversations(pendingConfirm.ids, "p5.chat.inbox.hide_success");
          }
        }}
        onOpenChange={(next) => {
          if (!next && !actionsBusy) setPendingConfirm(null);
        }}
      />

      <ChatInboxConfirmDialog
        open={pendingConfirm?.kind === "delete"}
        title={t("p5.chat.inbox.delete_confirm_title")}
        description={t("p5.chat.inbox.delete_confirm_desc", {
          count: pendingConfirm?.ids.length ?? 0,
        })}
        confirmLabel={t("p5.chat.inbox.delete_confirm_cta")}
        cancelLabel={t("message_thread.hide_confirm_cancel")}
        busy={actionsBusy}
        destructive
        onConfirm={() => {
          if (pendingConfirm?.kind === "delete") {
            void runHideConversations(pendingConfirm.ids, "p5.chat.inbox.delete_success");
          }
        }}
        onOpenChange={(next) => {
          if (!next && !actionsBusy) setPendingConfirm(null);
        }}
      />

      <ChatInboxCollectionsMenu
        open={collectionsMenuOpen}
        hiddenCount={hiddenCount}
        blockedCount={blockedCount}
        mutedCount={mutedCount}
        onOpenChange={setCollectionsMenuOpen}
        onSelect={setCollectionView}
      />
    </div>
  );
}

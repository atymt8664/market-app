import { Redirect, Link, useLocation } from "wouter";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  useDeleteConversationForMe,
  useRestoreConversationForMe,
  type ConversationListItem,
  type UserPresenceEntry,
} from "@workspace/api-client-react";
import { ChatInboxActionSheet } from "@/components/chat-inbox-action-sheet";
import { ChatInboxDeleteUndoSnackbar } from "@/components/chat-inbox-delete-undo-snackbar";
import { ChatInboxConfirmDialog } from "@/components/chat-inbox-confirm-dialog";
import { ProfileAvatarRing } from "@/components/profile-avatar-ring";
import { ChatInboxPresenceLine } from "@/components/chat-inbox-presence-line";
import { ChatInboxSelectionHeader } from "@/components/chat-inbox-selection-header";
import { useAppChromeContext } from "@/contexts/app-chrome-context";
import { useAuth } from "@/hooks/use-auth";
import { useInboxClientPrefs } from "@/hooks/use-inbox-client-prefs";
import { useInboxLongPress } from "@/hooks/use-inbox-long-press";
import { Skeleton } from "@/components/ui/skeleton";
import { BellOff, Check, MessageCircle, Pin, Search } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { useChatSocket, type ChatSocketEvent } from "@/hooks/use-chat-socket";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { MESSAGES_CONVERSATION_BADGE_CLASS } from "@/lib/messages-badge-styles";
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
  BOTTOM_NAV_SCROLL_END_SPACER_CLASS,
} from "@/lib/bottom-nav-layout";
import { AppShellContentScroll } from "@/components/app-shell-content-scroll";
import { bustConversationThreadCache } from "@/lib/chat-thread-cache";
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
  restoreConversationsToInboxCache,
} from "@/lib/inbox-conversation-cache";
import { STALE_CONVERSATIONS_MS } from "@/lib/query-stale-times";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import {
  appInlineStartJustifyClass,
  appTextAlignClass,
  getAppTextDir,
} from "@/lib/app-text-direction";
import { inboxCollectionShellClass } from "@/lib/chat-inbox-collection-styles";
import {
  TAB_EMPTY_CTA_CLASS,
  TAB_EMPTY_DESC_CLASS,
  TAB_EMPTY_ICON_RING_CLASS,
  TAB_EMPTY_PAGE_TOP_CLASS,
  TAB_EMPTY_TITLE_CLASS,
  TAB_EMPTY_WRAPPER_CLASS,
  tabEmptyCardClass,
} from "@/lib/tab-empty-state-layout";

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
      (a.otherAvatarUrl ?? "") === (b.otherAvatarUrl ?? "") &&
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
      <ProfileAvatarRing
        name={c.otherName}
        src={c.otherAvatarUrl}
        size={30}
      />
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
          adTitle=""
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
            <span className={MESSAGES_CONVERSATION_BADGE_CLASS}>
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
  const [deleteUndoSnack, setDeleteUndoSnack] = useState<{
    convId: number;
    snapshot: ConversationListItem[];
  } | null>(null);

  const hideConversationMutation = useHideConversationForMe();
  const deleteConversationMutation = useDeleteConversationForMe();
  const restoreConversationMutation = useRestoreConversationForMe();
  const { pinnedSet, mutedSet, togglePin, toggleMute, applyPin, applyMute, prefs } =
    useInboxClientPrefs(user?.id);

  const collectionsPrefetchEnabled = Boolean(user) && !authLoading;
  const hiddenQ = useInboxHiddenConversations(collectionsPrefetchEnabled);
  const blockedQ = useInboxBlockedUsers(collectionsPrefetchEnabled);

  const hiddenCount = hiddenQ.data?.length ?? 0;
  const blockedCount = blockedQ.data?.length ?? 0;
  const { setOverride } = useAppChromeContext();

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

  useLayoutEffect(() => {
    if (collectionView || selectMode) {
      setOverride({ hidden: true });
      return () => setOverride({});
    }
    if (showInboxEmpty) {
      setOverride({});
      return () => setOverride({});
    }
    setOverride({
      trailing: (
        <ChatInboxCollectionsMenuButton
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: inboxBlockedQueryKey() });
            void queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
            setCollectionsMenuOpen(true);
          }}
        />
      ),
    });
    return () => setOverride({});
  }, [collectionView, selectMode, queryClient, setOverride, showInboxEmpty]);

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
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setActionsBusy(true);
      removeConversationsFromInboxCache(queryClient, ids);
      try {
        await Promise.all(ids.map((id) => hideConversationMutation.mutateAsync({ convId: id })));
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t("p5.chat.inbox.hide_success") });
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

  const undoDeleteConversation = useCallback(
    async (convId: number, snapshot: ConversationListItem[]) => {
      try {
        await restoreConversationMutation.mutateAsync({ convId });
        restoreConversationsToInboxCache(queryClient, snapshot);
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t("p5.chat.inbox.delete_undo_success") });
      } catch {
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t("p5.chat.inbox.delete_undo_failed"), variant: "destructive" });
      }
    },
    [queryClient, restoreConversationMutation, toast],
  );

  const runDeleteConversations = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setActionsBusy(true);
      const listKey = getListConversationsQueryKey();
      const cached = queryClient.getQueryData<ConversationListItem[]>(listKey);
      const idSet = new Set(ids);
      const snapshot = (cached ?? []).filter((row) => idSet.has(row.id));
      removeConversationsFromInboxCache(queryClient, ids);
      try {
        await Promise.all(ids.map((id) => deleteConversationMutation.mutateAsync({ convId: id })));
        for (const id of ids) {
          bustConversationThreadCache(queryClient, id);
        }
        await queryClient.invalidateQueries({ queryKey: listKey });
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        if (ids.length === 1 && snapshot.length === 1) {
          setDeleteUndoSnack({ convId: ids[0]!, snapshot });
        } else {
          toast({ title: t("p5.chat.inbox.delete_success_many") });
        }
        setActionSheetConvId(null);
        exitSelectMode();
      } catch {
        await queryClient.invalidateQueries({ queryKey: listKey });
        await queryClient.invalidateQueries({ queryKey: inboxHiddenQueryKey() });
        toast({ title: t("p5.chat.inbox.delete_failed"), variant: "destructive" });
      } finally {
        setActionsBusy(false);
        setPendingConfirm(null);
      }
    },
    [deleteConversationMutation, exitSelectMode, queryClient, toast],
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
      <AppShellContentScroll>
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
      ) : null}

      <div
        className={cn(
          "mx-auto flex w-full max-w-[820px] flex-1 px-4 md:px-6",
          showInboxEmpty ? cn(TAB_EMPTY_PAGE_TOP_CLASS, "px-3 md:px-4") : "pt-3",
        )}
      >
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
          <div className={TAB_EMPTY_WRAPPER_CLASS}>
            <div className={tabEmptyCardClass()} dir="rtl" data-testid="tab-empty-state-card">
              <div className={TAB_EMPTY_ICON_RING_CLASS}>
                <MessageCircle
                  className="h-8 w-8 text-primary md:h-9 md:w-9"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <h3 className={TAB_EMPTY_TITLE_CLASS}>
                {t("messages.empty_title")}
              </h3>
              <p className={TAB_EMPTY_DESC_CLASS}>
                {t("messages.empty_desc")}
              </p>
              <Link href="/" className={TAB_EMPTY_CTA_CLASS}>
                <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                {t("messages.browse_ads")}
              </Link>
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

      <div
        aria-hidden
        className={BOTTOM_NAV_SCROLL_END_SPACER_CLASS}
        data-testid="messages-scroll-spacer"
      />
      </AppShellContentScroll>

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
            void runHideConversations(pendingConfirm.ids);
          }
        }}
        onOpenChange={(next) => {
          if (!next && !actionsBusy) setPendingConfirm(null);
        }}
      />

      <ChatInboxConfirmDialog
        open={pendingConfirm?.kind === "delete"}
        title={t(
          (pendingConfirm?.ids.length ?? 0) === 1
            ? "p5.chat.inbox.delete_confirm_title_one"
            : "p5.chat.inbox.delete_confirm_title_many",
        )}
        description={t(
          (pendingConfirm?.ids.length ?? 0) === 1
            ? "p5.chat.inbox.delete_confirm_desc_one"
            : "p5.chat.inbox.delete_confirm_desc_many",
        )}
        confirmLabel={t("p5.chat.inbox.delete_confirm_cta")}
        cancelLabel={t("message_thread.hide_confirm_cancel")}
        busy={actionsBusy}
        destructive
        onConfirm={() => {
          if (pendingConfirm?.kind === "delete") {
            void runDeleteConversations(pendingConfirm.ids);
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

      <ChatInboxDeleteUndoSnackbar
        open={deleteUndoSnack !== null}
        onUndo={() => {
          const pending = deleteUndoSnack;
          setDeleteUndoSnack(null);
          if (pending) {
            void undoDeleteConversation(pending.convId, pending.snapshot);
          }
        }}
        onExpire={() => setDeleteUndoSnack(null)}
      />
    </div>
  );
}

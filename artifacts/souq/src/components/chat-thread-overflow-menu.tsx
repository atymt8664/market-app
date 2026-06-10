import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  getListConversationsQueryKey,
  getGetConversationQueryKey,
  invalidateUserPresenceBatchQueries,
  useHideConversationForMe,
  getAuthProfileCsrfTokenForRequest,
  ApiError,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Flag,
  ListX,
  Megaphone,
  MessagesSquare,
  MoreVertical,
  ShieldBan,
  ShieldOff,
  UserRound,
  X,
} from "lucide-react";

import { CHAT_INBOX_OVERFLOW_BTN } from "@/lib/chat-thread-header-styles";

/** Legacy circular lime header control — retained for non-compact callers. */
const CHAT_HEADER_ICON_BTN_LEGACY =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/60 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-black/90 active:opacity-90";

/** نفس أسلوب bottom sheet صفحة إنشاء إعلان */
const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

const SHEET_CLOSE_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

const MENU_CARD_BTN =
  "flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-4 py-3.5 text-start shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-colors hover:border-primary/48 hover:bg-black/92 active:scale-[0.99]";

/** أيقونات بنود القائمة — lime/subtle مثل أزرار الحظر */
const MENU_ITEM_ICON =
  "h-4 w-4 shrink-0 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.22)] opacity-95";

const REASON_CHIP = (active: boolean) =>
  [
    "rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
    active
      ? "border-primary/55 bg-primary/15 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.35)]"
      : "border-primary/25 bg-[#0A0A0A]/80 text-zinc-200 hover:border-primary/40 hover:bg-black/85",
  ].join(" ");

/** مطابقة نافذة تأكيد الحظر في user-profile */
const alertSurface =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

type Panel = "main" | "report-user" | "report-conversation";

export function ChatThreadOverflowMenu({
  conversationId,
  otherUserId,
  adId,
  adAvailable = true,
  dirRtl,
  compact = false,
}: {
  conversationId: number;
  otherUserId: number;
  adId: number;
  /** From GET /conversations/:id — false when the ad row was deleted. */
  adAvailable?: boolean;
  dirRtl: boolean;
  /** Compact ghost icon — P5 thread header polish. */
  compact?: boolean;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: me } = useAuth();
  const hideConversationMutation = useHideConversationForMe();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [reason, setReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [reporting, setReporting] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const [blockActionPending, setBlockActionPending] = useState(false);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);

  const myId = me?.id;
  const showPeerBlockControls =
    typeof myId === "number" &&
    myId > 0 &&
    otherUserId > 0 &&
    otherUserId !== myId;

  const userBlockStatusQueryKey = [
    "userBlockStatus",
    otherUserId,
    myId ?? 0,
  ] as const;

  const { data: blockStatus, isPending: blockStatusPending } = useQuery({
    queryKey: userBlockStatusQueryKey,
    enabled: showPeerBlockControls,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/users/${otherUserId}/block-status`), {
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `HTTP ${res.status}`);
      }
      return (await res.json()) as { blockedByMe: boolean; blocksMe?: boolean };
    },
  });

  const csrfHeadersForUserBlock = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const csrf = getAuthProfileCsrfTokenForRequest();
    if (typeof csrf === "string" && csrf.length >= 32) {
      headers["X-CSRF-Token"] = csrf;
    }
    return headers;
  };

  const attemptBlockPeer = async () => {
    setBlockConfirmOpen(false);
    if (!me) return;
    setBlockActionPending(true);
    try {
      const res = await fetch(apiUrl(`/api/users/${otherUserId}/block`), {
        method: "POST",
        credentials: "include",
        headers: csrfHeadersForUserBlock(),
      });
      if (res.ok) {
        toast({ title: t("message_thread.chat_block_success") });
        queryClient.setQueryData<{ blockedByMe: boolean }>(userBlockStatusQueryKey, {
          blockedByMe: true,
        });
        await queryClient.invalidateQueries({ queryKey: userBlockStatusQueryKey });
        await invalidateUserPresenceBatchQueries(queryClient, [otherUserId]);
        return;
      }
    } catch {
      /* network */
    } finally {
      setBlockActionPending(false);
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
      variant: "destructive",
    });
  };

  const attemptUnblockPeer = async () => {
    setUnblockConfirmOpen(false);
    if (!me) return;
    setBlockActionPending(true);
    try {
      const res = await fetch(apiUrl(`/api/users/${otherUserId}/block`), {
        method: "DELETE",
        credentials: "include",
        headers: csrfHeadersForUserBlock(),
      });
      if (res.ok) {
        toast({ title: t("message_thread.chat_unblock_success") });
        queryClient.setQueryData<{ blockedByMe: boolean }>(userBlockStatusQueryKey, {
          blockedByMe: false,
        });
        await queryClient.invalidateQueries({ queryKey: userBlockStatusQueryKey });
        await invalidateUserPresenceBatchQueries(queryClient, [otherUserId]);
        return;
      }
    } catch {
      /* network */
    } finally {
      setBlockActionPending(false);
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
      variant: "destructive",
    });
  };

  const otherReason = t("message_thread.report_user_reason_other");

  const reportReasonOptions = useCallback(
    () => [
      t("message_thread.report_user_reason_abusive"),
      t("message_thread.report_user_reason_harassment"),
      t("message_thread.report_user_reason_scam"),
      t("message_thread.report_user_reason_spam"),
      otherReason,
    ],
    [otherReason],
  );

  const resetReportForm = () => {
    setReason("");
    setReportExtra("");
  };

  const closeAll = () => {
    setOpen(false);
    setPanel("main");
    resetReportForm();
  };

  const submitReport = async (mode: "user" | "conversation") => {
    if (!reason) {
      toast({
        title: t("ad_detail.error"),
        description: t("message_thread.report_user_reason_placeholder"),
        variant: "destructive",
      });
      return;
    }
    if (reason === otherReason && !reportExtra.trim()) {
      toast({
        title: t("ad_detail.error"),
        description: t("message_thread.report_user_details_placeholder"),
        variant: "destructive",
      });
      return;
    }

    setReporting(true);
    try {
      const payload =
        mode === "conversation"
          ? {
              reportConversation: true,
              conversationId,
              reason,
              description: reportExtra.trim() || undefined,
            }
          : {
              targetUserId: otherUserId,
              reason,
              description: reportExtra.trim() || undefined,
              conversationId,
            };

      const csrf = getAuthProfileCsrfTokenForRequest();
      const reportHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (typeof csrf === "string" && csrf.length >= 32) {
        reportHeaders["X-CSRF-Token"] = csrf;
      }

      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: reportHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        toast({
          title: t("ad_detail.report.failed"),
          description: errText || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("ad_detail.done"),
        description: t("ad_detail.report.sent"),
      });
      closeAll();
    } catch {
      toast({
        title: t("ad_detail.report.failed"),
        variant: "destructive",
      });
    } finally {
      setReporting(false);
    }
  };

  const titleForPanel =
    panel === "report-user"
      ? t("message_thread.report_user_title")
      : panel === "report-conversation"
        ? t("message_thread.report_conversation_title")
        : t("message_thread.menu_title");

  const runHideConversationForMe = () => {
    hideConversationMutation.mutate(
      { convId: conversationId },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey(),
          });
          await queryClient.invalidateQueries({
            queryKey: getGetConversationQueryKey(conversationId),
          });
          closeAll();
          navigate("/messages");
          toast({
            title: t("message_thread.hide_conversation_done"),
            description: t("message_thread.hide_conversation_hint"),
          });
        },
        onError: (err: unknown) => {
          const detail =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "";
          const trimmed = detail.trim();
          toast({
            title: t("message_thread.hide_conversation_failed"),
            ...(trimmed ? { description: trimmed } : {}),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <>
      <button
        type="button"
        className={compact ? CHAT_INBOX_OVERFLOW_BTN : CHAT_HEADER_ICON_BTN_LEGACY}
        aria-label={t("message_thread.menu_open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setPanel("main");
          resetReportForm();
          setOpen(true);
        }}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) closeAll();
          else setOpen(true);
        }}
      >
        <SheetContent
          side="bottom"
          hideClose
          className={`${SHEET_SHELL} border-x-0 border-b-0 p-0 sm:mx-auto sm:max-w-lg`}
        >
          <div className="flex max-h-[min(90dvh,720px)] flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4">
              {panel !== "main" ? (
                <button
                  type="button"
                  className={SHEET_CLOSE_BTN}
                  aria-label={t("message_thread.menu_back")}
                  onClick={() => {
                    setPanel("main");
                    resetReportForm();
                  }}
                >
                  <ArrowRight className={dirRtl ? "h-4 w-4" : "h-4 w-4 rotate-180"} aria-hidden />
                </button>
              ) : (
                <span className="w-9 shrink-0" aria-hidden />
              )}
              <SheetTitle className="m-0 flex-1 text-center text-base font-semibold text-white">
                {titleForPanel}
              </SheetTitle>
              <SheetClose asChild>
                <button type="button" className={SHEET_CLOSE_BTN} aria-label={t("message_thread.menu_close")}>
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </SheetClose>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {panel === "main" ? (
                <div className="flex flex-col gap-2.5" dir={dirRtl ? "rtl" : "ltr"}>
                  <SheetDescription className="sr-only">{t("message_thread.menu_title")}</SheetDescription>
                  <Link
                    href={`/users/${otherUserId}`}
                    className={MENU_CARD_BTN}
                    onClick={() => closeAll()}
                  >
                    <UserRound className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold text-white">
                      {t("message_thread.menu_view_profile")}
                    </span>
                  </Link>
                  {adAvailable ? (
                    <Link href={`/ad/${adId}`} className={MENU_CARD_BTN} onClick={() => closeAll()}>
                      <Megaphone className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                      <span className="flex-1 text-sm font-semibold text-white">
                        {t("message_thread.menu_view_ad")}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={t("message_thread.menu_ad_unavailable")}
                      className={`${MENU_CARD_BTN} pointer-events-auto cursor-not-allowed items-start opacity-45`}
                    >
                      <Megaphone className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col items-stretch gap-1 text-start">
                        <span className="text-sm font-semibold text-zinc-400">
                          {t("message_thread.menu_view_ad")}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-500">
                          {t("message_thread.menu_ad_unavailable")}
                        </span>
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={MENU_CARD_BTN}
                    onClick={() => {
                      setPanel("report-user");
                      resetReportForm();
                    }}
                  >
                    <Flag className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold text-white">
                      {t("message_thread.menu_report_user")}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={MENU_CARD_BTN}
                    onClick={() => {
                      setPanel("report-conversation");
                      resetReportForm();
                    }}
                  >
                    <MessagesSquare className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold text-white">
                      {t("message_thread.menu_report_conversation")}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={hideConversationMutation.isPending}
                    className={`${MENU_CARD_BTN} disabled:pointer-events-none disabled:opacity-45`}
                    onClick={() => setHideConfirmOpen(true)}
                  >
                    <ListX className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                    <span className="flex-1 text-sm font-semibold text-white">
                      {hideConversationMutation.isPending
                        ? "…"
                        : t("message_thread.menu_hide_conversation")}
                    </span>
                  </button>
                  {showPeerBlockControls ? (
                    <button
                      type="button"
                      disabled={blockActionPending || blockStatusPending}
                      className={MENU_CARD_BTN}
                      onClick={() =>
                        blockStatus?.blockedByMe
                          ? setUnblockConfirmOpen(true)
                          : setBlockConfirmOpen(true)
                      }
                    >
                      {blockStatus?.blockedByMe ? (
                        <ShieldOff className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                      ) : (
                        <ShieldBan className={MENU_ITEM_ICON} strokeWidth={2.25} aria-hidden />
                      )}
                      <span className="flex-1 text-sm font-semibold text-white">
                        {blockStatusPending || blockActionPending
                          ? "…"
                          : blockStatus?.blockedByMe
                            ? t("message_thread.chat_unblock_menu")
                            : t("message_thread.chat_block_menu")}
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-3" dir={dirRtl ? "rtl" : "ltr"}>
                  <p className="text-center text-[12px] leading-relaxed text-zinc-400">
                    {panel === "report-conversation"
                      ? t("message_thread.report_conversation_desc")
                      : t("message_thread.report_user_desc")}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {reportReasonOptions().map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={REASON_CHIP(reason === opt)}
                        onClick={() => setReason(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder={t("message_thread.report_user_details_placeholder")}
                    value={reportExtra}
                    onChange={(e) => setReportExtra(e.target.value)}
                    className="min-h-[88px] resize-none rounded-xl border border-primary/28 bg-[#0A0A0A]/90 text-sm text-white placeholder:text-zinc-500 focus-visible:border-primary/45 focus-visible:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={
                      reporting || !reason || (reason === otherReason && !reportExtra.trim())
                    }
                    onClick={() =>
                      void submitReport(panel === "report-conversation" ? "conversation" : "user")
                    }
                    className="mb-2 w-full rounded-xl border border-primary/45 bg-primary/15 py-3 text-sm font-bold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] transition-colors hover:bg-primary/22 disabled:pointer-events-none disabled:opacity-45"
                  >
                    {reporting ? "…" : t("message_thread.report_user_submit")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={hideConfirmOpen}
        onOpenChange={(next) => {
          if (next === false && hideConversationMutation.isPending) return;
          setHideConfirmOpen(next);
        }}
      >
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          className={cn(alertSurface, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader
            className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}
          >
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("message_thread.hide_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("message_thread.hide_confirm_desc", {
                hiddenEntry: t("messages.hidden_open"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              dirRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              disabled={hideConversationMutation.isPending}
              onClick={() => {
                setHideConfirmOpen(false);
                runHideConversationForMe();
              }}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-primary/45 bg-primary/15 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 transition-colors hover:bg-primary/22 disabled:pointer-events-none disabled:opacity-45 sm:flex-none",
              )}
            >
              {hideConversationMutation.isPending
                ? "…"
                : t("message_thread.hide_confirm_cta")}
            </button>
            <AlertDialogCancel
              disabled={hideConversationMutation.isPending}
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 disabled:opacity-45 sm:flex-none",
              )}
            >
              {t("message_thread.hide_confirm_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          className={cn(alertSurface, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader
            className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}
          >
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("message_thread.chat_block_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("message_thread.chat_block_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              dirRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              onClick={() => void attemptBlockPeer()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-red-500/40 bg-[#0A0A0A]/90 px-4 text-sm font-semibold text-red-200 shadow-[0_0_18px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/15 transition-colors hover:border-red-500/55 hover:bg-red-950/25 sm:flex-none",
              )}
            >
              {t("message_thread.chat_block_confirm_cta")}
            </button>
            <AlertDialogCancel
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 sm:flex-none",
              )}
            >
              {t("message_thread.chat_block_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unblockConfirmOpen} onOpenChange={setUnblockConfirmOpen}>
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          className={cn(alertSurface, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader
            className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}
          >
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("message_thread.chat_unblock_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("message_thread.chat_unblock_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              dirRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              onClick={() => void attemptUnblockPeer()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-primary/45 bg-primary/15 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 transition-colors hover:bg-primary/22 sm:flex-none",
              )}
            >
              {t("message_thread.chat_unblock_confirm_cta")}
            </button>
            <AlertDialogCancel
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 sm:flex-none",
              )}
            >
              {t("message_thread.chat_unblock_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

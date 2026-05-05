import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  getListConversationsQueryKey,
  useHideConversationForMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, MoreVertical, X } from "lucide-react";

/** نفس زر الرجوع في رأس الشات */
const CHAT_HEADER_ICON_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/60 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-zinc-900/90 active:opacity-90";

/** نفس أسلوب bottom sheet صفحة إنشاء إعلان */
const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

const SHEET_CLOSE_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-zinc-950/90 text-primary transition-colors hover:border-primary/65 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

const MENU_CARD_BTN =
  "flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-zinc-950/90 px-4 py-3.5 text-start shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-colors hover:border-primary/48 hover:bg-zinc-900/92 active:scale-[0.99]";

const REASON_CHIP = (active: boolean) =>
  [
    "rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
    active
      ? "border-primary/55 bg-primary/15 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.35)]"
      : "border-primary/25 bg-zinc-950/80 text-zinc-200 hover:border-primary/40 hover:bg-zinc-900/85",
  ].join(" ");

type Panel = "main" | "report-user" | "report-conversation";

export function ChatThreadOverflowMenu({
  conversationId,
  otherUserId,
  adId,
  adAvailable = true,
  dirRtl,
}: {
  conversationId: number;
  otherUserId: number;
  adId: number;
  /** From GET /conversations/:id — false when the ad row was deleted. */
  adAvailable?: boolean;
  dirRtl: boolean;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hideConversationMutation = useHideConversationForMe();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [reason, setReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [reporting, setReporting] = useState(false);

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

      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <>
      <button
        type="button"
        className={CHAT_HEADER_ICON_BTN}
        aria-label={t("message_thread.menu_open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setPanel("main");
          resetReportForm();
          setOpen(true);
        }}
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
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
                    <span className="flex-1 text-sm font-semibold text-white">
                      {t("message_thread.menu_view_profile")}
                    </span>
                  </Link>
                  {adAvailable ? (
                    <Link href={`/ad/${adId}`} className={MENU_CARD_BTN} onClick={() => closeAll()}>
                      <span className="flex-1 text-sm font-semibold text-white">
                        {t("message_thread.menu_view_ad")}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={t("message_thread.menu_ad_unavailable")}
                      className={`${MENU_CARD_BTN} pointer-events-auto flex-col items-stretch gap-1 cursor-not-allowed opacity-45`}
                    >
                      <span className="w-full text-start text-sm font-semibold text-zinc-400">
                        {t("message_thread.menu_view_ad")}
                      </span>
                      <span className="w-full text-start text-[11px] font-medium text-zinc-500">
                        {t("message_thread.menu_ad_unavailable")}
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
                    <span className="flex-1 text-sm font-semibold text-white">
                      {t("message_thread.menu_report_conversation")}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={hideConversationMutation.isPending}
                    className={`${MENU_CARD_BTN} border-red-500/35 bg-red-950/20 text-red-200 ring-red-500/15 hover:border-red-500/50 hover:bg-red-950/35 disabled:opacity-45`}
                    onClick={() => {
                      hideConversationMutation.mutate(
                        { convId: conversationId },
                        {
                          onSuccess: () => {
                            void queryClient.invalidateQueries({
                              queryKey: getListConversationsQueryKey(),
                            });
                            closeAll();
                            navigate("/messages");
                            toast({
                              title: t("message_thread.hide_conversation_done"),
                              description: t("message_thread.hide_conversation_hint"),
                            });
                          },
                          onError: () => {
                            toast({
                              title: t("ad_detail.error"),
                              description: t("message_thread.hide_conversation_failed"),
                              variant: "destructive",
                            });
                          },
                        },
                      );
                    }}
                  >
                    <span className="flex-1 text-sm font-semibold">
                      {hideConversationMutation.isPending
                        ? "…"
                        : t("message_thread.menu_hide_conversation")}
                    </span>
                  </button>
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
                    className="min-h-[88px] resize-none rounded-xl border border-primary/28 bg-zinc-950/90 text-sm text-white placeholder:text-zinc-500 focus-visible:border-primary/45 focus-visible:ring-primary/20"
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
    </>
  );
}

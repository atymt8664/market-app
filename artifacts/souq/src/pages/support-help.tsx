import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight, Ticket } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSupportTicket,
  getMySupportTicketMessages,
  getMySupportTickets,
} from "@/features/admin/api";
import { useToast } from "@/hooks/use-toast";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_CARD_TITLE,
  SETTINGS_FIELD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_INPUT,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_MESSAGE_BUBBLE,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PRIMARY_BUTTON,
  SETTINGS_STATUS_BADGE,
  SETTINGS_TICKET_ROW,
  SETTINGS_TICKET_ROW_SELECTED,
} from "@/components/settings-shell";
import { SettingsSheetSelect } from "@/components/settings-sheet-select";
import {
  getBrowserSearchRaw,
  navigateBackFromLegalPage,
  syncLegalExplicitFromCurrentUrl,
} from "@/lib/return-navigation";

const CATEGORY_OPTIONS = [
  { value: "general", label: "استفسار عام" },
  { value: "login", label: "تسجيل الدخول" },
  { value: "payment", label: "الدفع والفواتير" },
  { value: "ad", label: "مشكلة إعلان" },
  { value: "account", label: "الحساب والأمان" },
  { value: "other", label: "أخرى" },
] as const;

function ticketStatusBadgeClass(status: string) {
  const s = (status ?? "").toLowerCase();
  if (/open|new|pending|progress|in_progress|قيد|جديد|مفتوح/i.test(s)) {
    return `${SETTINGS_STATUS_BADGE} border-primary/45 bg-primary/15 text-primary`;
  }
  if (/close|resolved|done|complete|منجز|مغلق/i.test(s)) {
    return `${SETTINGS_STATUS_BADGE} border-emerald-500/35 bg-emerald-500/10 text-emerald-300`;
  }
  return `${SETTINGS_STATUS_BADGE} border-primary/22 bg-[#0A0A0A]/90 text-zinc-200`;
}

export default function SupportHelpPage() {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  useLayoutEffect(() => {
    syncLegalExplicitFromCurrentUrl();
  }, [pathname, search]);
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [relatedAdId, setRelatedAdId] = useState("");
  const [relatedUserId, setRelatedUserId] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tid = params.get("ticket");
    if (tid && /^\d+$/.test(tid)) {
      const id = Number.parseInt(tid, 10);
      if (Number.isInteger(id) && id > 0) setSelectedTicketId(id);
    }
  }, [search]);

  const parseOptionalId = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const myTicketsQuery = useQuery({
    queryKey: ["support", "mine"],
    queryFn: getMySupportTickets,
  });
  const myMessagesQuery = useQuery({
    queryKey: ["support", "messages", selectedTicketId],
    queryFn: () => getMySupportTicketMessages(selectedTicketId!),
    enabled: !!selectedTicketId,
  });

  const createMutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async (data) => {
      toast({
        title: "تم إرسال تذكرة الدعم",
        description: `تم إنشاء التذكرة رقم #${data?.id ?? ""} وسيتم متابعتها قريباً`,
      });
      setSubject("");
      setMessage("");
      setRelatedAdId("");
      setRelatedUserId("");
      setSelectedTicketId(data?.id ?? null);
      await myTicketsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "فشل إرسال التذكرة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  return (
    <div className={`flex flex-col ${SETTINGS_PAGE_BG}`}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>المساعدة والدعم</h1>
          <button
            type="button"
            onClick={() => {
              navigateBackFromLegalPage(navigate, getBrowserSearchRaw(), "/settings");
            }}
            className={SETTINGS_BACK_BUTTON}
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <main className={`${SETTINGS_MAIN_COLUMN} flex-1 space-y-4 ${SETTINGS_IMMERSIVE_BOTTOM}`} dir="rtl">
        <div className={SETTINGS_CARD}>
          <h2 className={`${SETTINGS_CARD_TITLE} mb-4`}>إنشاء تذكرة دعم</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                category,
                subject: subject.trim(),
                message: message.trim(),
                relatedAdId: parseOptionalId(relatedAdId),
                relatedUserId: parseOptionalId(relatedUserId),
              });
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="ticket-category" className={SETTINGS_LABEL}>
                نوع التذكرة
              </label>
              <SettingsSheetSelect
                id="ticket-category"
                aria-label="نوع التذكرة"
                sheetTitle="نوع التذكرة"
                value={category}
                onValueChange={setCategory}
                options={CATEGORY_OPTIONS}
                leading={<Ticket className="h-4 w-4" aria-hidden />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ticket-subject" className={SETTINGS_LABEL}>
                عنوان المشكلة
              </label>
              <input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="عنوان المشكلة"
                className={SETTINGS_INPUT}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ticket-message" className={SETTINGS_LABEL}>
                التفاصيل
              </label>
              <textarea
                id="ticket-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل المشكلة..."
                rows={5}
                className={`${SETTINGS_FIELD} min-h-[120px] resize-y`}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="related-ad" className={SETTINGS_LABEL}>
                  رقم الإعلان (اختياري)
                </label>
                <input
                  id="related-ad"
                  value={relatedAdId}
                  onChange={(e) => setRelatedAdId(e.target.value)}
                  placeholder="رقم الإعلان (اختياري)"
                  inputMode="numeric"
                  className={SETTINGS_INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="related-user" className={SETTINGS_LABEL}>
                  رقم المستخدم (اختياري)
                </label>
                <input
                  id="related-user"
                  value={relatedUserId}
                  onChange={(e) => setRelatedUserId(e.target.value)}
                  placeholder="رقم المستخدم (اختياري)"
                  inputMode="numeric"
                  className={SETTINGS_INPUT}
                />
              </div>
            </div>

            <div className={SETTINGS_ACTION_PANEL}>
              <button
                type="submit"
                disabled={createMutation.isPending || !subject.trim() || !message.trim()}
                className={SETTINGS_PRIMARY_BUTTON}
              >
                {createMutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
              </button>
            </div>
          </form>
        </div>

        <div className={SETTINGS_CARD}>
          <h2 className={`${SETTINGS_CARD_TITLE} mb-4`}>طلباتي</h2>
          {myTicketsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">جاري تحميل التذاكر...</p>
          ) : myTicketsQuery.isError ? (
            <p className="text-sm text-destructive">تعذر تحميل الطلبات.</p>
          ) : (myTicketsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد تذاكر بعد. أنشئ تذكرتك الأولى من النموذج أعلاه.
            </p>
          ) : (
            <div className="space-y-2">
              {myTicketsQuery.data?.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`${SETTINGS_TICKET_ROW} ${
                    selectedTicketId === ticket.id ? SETTINGS_TICKET_ROW_SELECTED : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium text-foreground">
                      #{ticket.id} - {ticket.subject}
                    </p>
                    <span className={ticketStatusBadgeClass(String(ticket.status))}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {ticket.category} •{" "}
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTicketId && (
          <div className={SETTINGS_CARD}>
            <h3 className={`${SETTINGS_CARD_TITLE} mb-4`}>
              تفاصيل التذكرة #{selectedTicketId}
            </h3>
            {myMessagesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">جاري تحميل الردود...</p>
            ) : myMessagesQuery.isError ? (
              <p className="text-sm text-destructive">تعذر تحميل الردود.</p>
            ) : (myMessagesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد رسائل بعد.</p>
            ) : (
              <div className="space-y-2">
                {myMessagesQuery.data?.map((msg) => (
                  <div
                    key={msg.id}
                    className={SETTINGS_MESSAGE_BUBBLE}
                  >
                    <p className="text-xs text-muted-foreground">
                      {msg.adminId ? "فريق الدعم" : "أنت"} •{" "}
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "—"}
                    </p>
                    <p className="mt-1">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

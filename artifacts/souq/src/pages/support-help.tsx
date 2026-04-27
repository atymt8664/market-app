import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSupportTicket,
  getMySupportTicketMessages,
  getMySupportTickets,
} from "@/features/admin/api";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { key: "general", label: "استفسار عام" },
  { key: "login", label: "تسجيل الدخول" },
  { key: "payment", label: "الدفع والفواتير" },
  { key: "ad", label: "مشكلة إعلان" },
  { key: "account", label: "الحساب والأمان" },
  { key: "other", label: "أخرى" },
];

export default function SupportHelpPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [relatedAdId, setRelatedAdId] = useState("");
  const [relatedUserId, setRelatedUserId] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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
    <div className="flex min-h-[100dvh] flex-col bg-background pb-6">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background p-4">
        <Link href="/settings">
          <button className="rounded-full p-2 -mr-2 transition-all hover:bg-muted active:scale-95">
            <ArrowRight className="h-5 w-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold">المساعدة والدعم</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">إنشاء تذكرة دعم</h2>
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="عنوان المشكلة"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              required
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل المشكلة..."
              rows={5}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              required
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={relatedAdId}
                onChange={(e) => setRelatedAdId(e.target.value)}
                placeholder="رقم الإعلان (اختياري)"
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={relatedUserId}
                onChange={(e) => setRelatedUserId(e.target.value)}
                placeholder="رقم المستخدم (اختياري)"
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || !subject.trim() || !message.trim()}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {createMutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            طلباتي
          </h2>
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
                  className={`w-full rounded-xl border px-3 py-2 text-right transition ${
                    selectedTicketId === ticket.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">#{ticket.id} - {ticket.subject}</p>
                    <span className="text-xs text-muted-foreground">{ticket.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.category} •{" "}
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTicketId && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
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
                  <div key={msg.id} className="rounded-lg border border-border bg-background p-3 text-sm">
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

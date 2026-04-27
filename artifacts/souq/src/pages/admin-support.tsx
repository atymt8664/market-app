import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  adminLogout,
  replyAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  useAdminSupportMessages,
  useAdminSupportTickets,
  useRequireAdmin,
} from "@/features/admin/hooks";
import type { AdminSupportTicket } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { key: "all", label: "الكل" },
  { key: "open", label: "مفتوحة" },
  { key: "pending", label: "قيد المعالجة" },
  { key: "resolved", label: "تم الحل" },
  { key: "closed", label: "مغلقة" },
];

function priorityLabel(priority: string) {
  if (priority === "low") return "منخفضة";
  if (priority === "normal") return "عادية";
  if (priority === "high") return "مرتفعة";
  if (priority === "urgent") return "عاجلة";
  return priority;
}

function statusLabel(status: string) {
  if (status === "open") return "مفتوحة";
  if (status === "pending") return "قيد المعالجة";
  if (status === "resolved") return "تم الحل";
  if (status === "closed") return "مغلقة";
  return status;
}

export default function AdminSupportPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meQuery = useRequireAdmin();

  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(
    null,
  );
  const [reply, setReply] = useState("");

  const ticketsQuery = useAdminSupportTickets({ status, q: search });
  const messagesQuery = useAdminSupportMessages(selectedTicket?.id ?? null);

  const visibleTickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin", "support", "tickets"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["admin", "support", "messages", selectedTicket?.id ?? null],
    });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        status?: "open" | "pending" | "resolved" | "closed";
        priority?: "low" | "normal" | "high" | "urgent";
      };
    }) => updateAdminSupportTicket(id, payload),
    onSuccess: async () => {
      await refresh();
      toast({
        title: "تم تحديث التذكرة",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث التذكرة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      replyAdminSupportTicket(id, message),
    onSuccess: async () => {
      setReply("");
      await refresh();
      toast({
        title: "تم إرسال الرد",
        description: "تم نشر الرد على التذكرة",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل إرسال الرد",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  return (
    <AdminShell activeKey="support" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">الدعم والمساعدة</h1>
          <p className="text-sm text-slate-400">
            إدارة تذاكر المستخدمين والرد على الاستفسارات
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              className="flex w-full max-w-xl gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث بالمستخدم أو العنوان أو النوع..."
                className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-4 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
              >
                بحث
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatus(item.key)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    status === item.key
                      ? "bg-indigo-500/20 text-indigo-200"
                      : "bg-[#0a1020] text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {ticketsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              جاري تحميل التذاكر...
            </div>
          ) : ticketsQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
              تعذر تحميل التذاكر. حاول مرة أخرى.
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              لا توجد تذاكر وفق عوامل البحث الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-2 text-right">رقم التذكرة</th>
                    <th className="px-2 py-2 text-right">المستخدم</th>
                    <th className="px-2 py-2 text-right">النوع</th>
                    <th className="px-2 py-2 text-right">العنوان</th>
                    <th className="px-2 py-2 text-right">الحالة</th>
                    <th className="px-2 py-2 text-right">الأولوية</th>
                    <th className="px-2 py-2 text-right">التاريخ</th>
                    <th className="px-2 py-2 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="cursor-pointer border-b border-slate-900/70 transition hover:bg-slate-900/60"
                    >
                      <td className="px-2 py-3">{ticket.id}</td>
                      <td className="px-2 py-3">
                        <p>{ticket.userName || "?"}</p>
                        <p className="text-xs text-slate-400">{ticket.userEmail || "?"}</p>
                      </td>
                      <td className="px-2 py-3">{ticket.category}</td>
                      <td className="px-2 py-3">{ticket.subject}</td>
                      <td className="px-2 py-3">{statusLabel(ticket.status)}</td>
                      <td className="px-2 py-3">{priorityLabel(ticket.priority)}</td>
                      <td className="px-2 py-3">
                        {ticket.createdAt
                          ? new Date(ticket.createdAt).toLocaleString()
                          : "?"}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          className="rounded-lg bg-slate-700 px-2 py-1 text-xs text-white"
                        >
                          التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedTicket &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 h-full w-full cursor-default"
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-[#0d1324] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">تفاصيل #{selectedTicket.id}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-lg bg-slate-700 px-3 py-1 text-sm"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p><span className="text-slate-400">المستخدم:</span> {selectedTicket.userName || "?"}</p>
                <p><span className="text-slate-400">البريد:</span> {selectedTicket.userEmail || "?"}</p>
                <p><span className="text-slate-400">النوع:</span> {selectedTicket.category}</p>
                <p><span className="text-slate-400">الحالة:</span> {statusLabel(selectedTicket.status)}</p>
                <p><span className="text-slate-400">الأولوية:</span> {priorityLabel(selectedTicket.priority)}</p>
                <p><span className="text-slate-400">رقم الإعلان:</span> {selectedTicket.relatedAdId || "?"}</p>
                <p><span className="text-slate-400">رقم المستخدم:</span> {selectedTicket.relatedUserId || "?"}</p>
                <p><span className="text-slate-400">التاريخ:</span> {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : "?"}</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                <p className="mb-2 text-xs text-slate-400">العنوان</p>
                <p className="text-sm">{selectedTicket.subject}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["open", "pending", "resolved", "closed"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={patchMutation.isPending || replyMutation.isPending}
                    onClick={() =>
                      patchMutation.mutate({
                        id: selectedTicket.id,
                        payload: { status: item },
                      })
                    }
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {item === "open"
                      ? "مفتوحة"
                      : item === "pending"
                        ? "قيد المعالجة"
                        : item === "resolved"
                          ? "تم الحل"
                          : "مغلقة"}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["low", "normal", "high", "urgent"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={patchMutation.isPending || replyMutation.isPending}
                    onClick={() =>
                      patchMutation.mutate({
                        id: selectedTicket.id,
                        payload: { priority: item },
                      })
                    }
                    className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    أولوية {priorityLabel(item)}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                <p className="mb-2 text-xs text-slate-400">الردود</p>
                {messagesQuery.isLoading ? (
                  <p className="text-sm text-slate-400">جاري تحميل الرسائل...</p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-red-300">تعذر تحميل الرسائل</p>
                ) : (messagesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">لا توجد رسائل بعد</p>
                ) : (
                  <div className="space-y-2">
                    {messagesQuery.data?.map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-2 text-sm">
                        <p className="text-xs text-slate-400">
                          {msg.adminId ? "المدير" : "المستخدم"} •{" "}
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "?"}
                        </p>
                        <p className="mt-1">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  replyMutation.mutate({
                    id: selectedTicket.id,
                    message: reply.trim(),
                  });
                }}
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="w-full rounded-xl border border-slate-700 bg-[#0a1020] px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  disabled={replyMutation.isPending || !reply.trim()}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {replyMutation.isPending ? "..." : "الرد"}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </AdminShell>
  );
}

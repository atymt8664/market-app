import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  ExternalLink,
  Headphones,
  Loader2,
  Megaphone,
  MessageSquare,
  Search,
  Send,
  User,
} from "lucide-react";
import {
  adminLogout,
  replyAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  useAdminDashboard,
  useAdminSupportMessages,
  useAdminSupportTickets,
  useRequireAdmin,
} from "@/features/admin/hooks";
import type { AdminSupportTicket } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { key: "all", label: "الكل" },
  { key: "open", label: "مفتوحة" },
  { key: "pending", label: "قيد المعالجة" },
  { key: "resolved", label: "تم الحل" },
  { key: "closed", label: "مغلقة" },
] as const;

function mediaSrc(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").slice(0, 2);
}

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

function categoryLabel(category: string) {
  const map: Record<string, string> = {
    general: "عام",
    login: "تسجيل الدخول",
    ad: "إعلان",
    payment: "دفع",
    account: "الحساب",
    other: "أخرى",
  };
  return map[category] ?? category;
}

function statusBadgeClass(status: string) {
  if (status === "open") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "pending") return "border-primary/45 bg-primary/15 text-primary";
  if (status === "resolved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "closed") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-zinc-600 bg-zinc-900/70 text-zinc-300";
}

function priorityBadgeClass(priority: string) {
  if (priority === "urgent") return "border-red-500/45 bg-red-950/35 text-red-200";
  if (priority === "high") return "border-orange-500/45 bg-orange-950/30 text-orange-200";
  if (priority === "normal") return "border-primary/35 bg-primary/10 text-primary";
  return "border-zinc-600 bg-zinc-800/70 text-zinc-300";
}

function formatTicketDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

export default function AdminSupportPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meQuery = useRequireAdmin();
  const dashboardQuery = useAdminDashboard();
  const supportStatusCounts = dashboardQuery.data?.statusCounts?.support ?? {};

  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [pendingCloseConfirm, setPendingCloseConfirm] = useState(false);

  const ticketsQuery = useAdminSupportTickets({ status, q: search });
  const messagesQuery = useAdminSupportMessages(selectedTicket?.id ?? null);

  const visibleTickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);

  const mergeTicketFromCache = useCallback(
    (ticketId: number) => {
      const list = queryClient.getQueryData<AdminSupportTicket[]>([
        "admin",
        "support",
        "tickets",
        status,
        search,
      ]);
      return list?.find((t) => t.id === ticketId);
    },
    [queryClient, status, search],
  );

  const refresh = async (messageTicketId?: number | null) => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
    await queryClient.invalidateQueries({
      queryKey: ["admin", "support", "messages", messageTicketId ?? selectedTicket?.id ?? null],
    });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.refetchQueries({
      queryKey: ["admin", "support", "tickets", status, search],
    });
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
    onSuccess: async (_, variables) => {
      setSelectedTicket((prev) =>
        prev && prev.id === variables.id ? { ...prev, ...variables.payload } : prev,
      );
      await refresh(variables.id);
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== variables.id) return prev;
        const fromCache = mergeTicketFromCache(variables.id);
        return fromCache ? { ...prev, ...fromCache } : prev;
      });
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
    onSuccess: async (_, variables) => {
      setReply("");
      setSelectedTicket((prev) =>
        prev && prev.id === variables.id ? { ...prev, status: "pending" } : prev,
      );
      await refresh(variables.id);
      await queryClient.invalidateQueries({
        queryKey: ["admin", "support", "messages", variables.id],
      });
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== variables.id) return prev;
        const fromCache = mergeTicketFromCache(variables.id);
        return fromCache ? { ...prev, ...fromCache } : prev;
      });
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

  const closeTicketModal = useCallback(() => {
    setSelectedTicket(null);
    setReply("");
    setPendingCloseConfirm(false);
  }, []);

  const sortedMessages = useMemo(() => {
    const arr = [...(messagesQuery.data ?? [])];
    arr.sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );
    return arr;
  }, [messagesQuery.data]);

  const initialMessageText = sortedMessages[0]?.message ?? null;

  useEffect(() => {
    if (!selectedTicket) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTicketModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTicket, closeTicketModal]);

  const actionPending = patchMutation.isPending || replyMutation.isPending;

  const confirmCloseTicket = () => {
    if (!selectedTicket) return;
    patchMutation.mutate(
      { id: selectedTicket.id, payload: { status: "closed" } },
      { onSettled: () => setPendingCloseConfirm(false) },
    );
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="support" onLogout={handleLogout}>
      <div className="space-y-6" dir="rtl">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>الدعم والمساعدة</h1>
            <p className="text-sm text-muted-foreground">إدارة تذاكر المستخدمين والرد على الاستفسارات</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Headphones className="h-3.5 w-3.5 text-primary" aria-hidden />
            {visibleTickets.length.toLocaleString("ar-EG")} تذكرة في العرض
          </span>
        </header>

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["open", "مفتوحة", supportStatusCounts.open],
                ["pending", "قيد المعالجة", supportStatusCounts.pending],
                ["resolved", "تم الحل", supportStatusCounts.resolved],
                ["closed", "مغلقة", supportStatusCounts.closed],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={cn(
                  BTN_FIX,
                  "rounded-2xl border p-3 text-right transition-all duration-150 ease-out active:scale-[0.98]",
                  "hover:border-primary/45 hover:shadow-[0_0_18px_-10px_hsl(var(--primary)/0.18)]",
                  status === key
                    ? "border-primary/45 bg-primary/10 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15"
                    : "border-primary/20 bg-zinc-900/50 ring-1 ring-primary/5",
                )}
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums",
                    key === "open" && "text-amber-200",
                    key === "pending" && "text-primary",
                    key === "resolved" && "text-emerald-200",
                    key === "closed" && "text-zinc-200",
                  )}
                >
                  {Number(count ?? 0).toLocaleString("ar-EG")}
                </p>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <form
              className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ابحث بالمستخدم أو العنوان أو النوع..."
                  className={cn(inputClass, "pr-10")}
                  aria-label="بحث في التذاكر"
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                بحث
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatus(item.key)}
                  className={adminPillBtn(status === item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {ticketsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-zinc-900/40 py-12 text-muted-foreground ring-1 ring-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              جاري تحميل التذاكر...
            </div>
          ) : ticketsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-950/25 px-4 py-10 text-center text-sm text-red-200 ring-1 ring-red-500/20">
              تعذر تحميل التذاكر. حاول مرة أخرى.
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-zinc-900/40 py-12 text-center text-sm text-muted-foreground">
              لا توجد تذاكر وفق عوامل البحث الحالية.
            </div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-primary/25 bg-zinc-900/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">#</th>
                    <th className="px-3 py-3 text-right font-medium">المستخدم</th>
                    <th className="px-3 py-3 text-right font-medium">النوع</th>
                    <th className="px-3 py-3 text-right font-medium">العنوان</th>
                    <th className="px-3 py-3 text-right font-medium">الحالة</th>
                    <th className="px-3 py-3 text-right font-medium">الأولوية</th>
                    <th className="px-3 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-3 py-3 text-center font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={cn("cursor-pointer last:border-0", ADMIN_TABLE_ROW)}
                    >
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{ticket.id}</td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 shrink-0 border border-primary/25 ring-1 ring-primary/10">
                            <AvatarImage src={mediaSrc(ticket.userAvatarUrl)} alt="" className="object-cover" />
                            <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
                              {initials(ticket.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 text-right">
                            <p className="line-clamp-1 font-medium text-foreground">{ticket.userName || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{ticket.userEmail || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">{categoryLabel(ticket.category)}</td>
                      <td className="max-w-[220px] px-3 py-3 align-middle">
                        <p className="line-clamp-2 font-medium text-foreground">{ticket.subject}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            statusBadgeClass(ticket.status),
                          )}
                        >
                          {statusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            priorityBadgeClass(ticket.priority),
                          )}
                        >
                          {priorityLabel(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle whitespace-nowrap text-[13px] text-muted-foreground">
                        {formatTicketDate(ticket.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className={cn(
                            ADMIN_ROW_ACTION_BASE,
                            "border-primary/40 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/18",
                          )}
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
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={() => closeTicketModal()}
            role="presentation"
          >
            <div
              className={cn(
                CARD_SHELL,
                "max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-[0_0_40px_-16px_hsl(var(--primary)/0.45)]",
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-support-detail-title"
              dir="rtl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="admin-support-detail-title" className="text-xl font-semibold text-foreground">
                    تذكرة #{selectedTicket.id}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTicketDate(selectedTicket.createdAt)}
                    {selectedTicket.updatedAt ? (
                      <span className="mr-2 text-[13px]">
                        · آخر تحديث: {formatTicketDate(selectedTicket.updatedAt)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeTicketModal()}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST, "shrink-0")}
                >
                  إغلاق
                </button>
              </div>

              <div className={cn(CARD_SHELL, "mb-4 p-4")}>
                <p className="mb-3 text-xs font-medium text-muted-foreground">المستخدم</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border border-primary/30 ring-1 ring-primary/10">
                    <AvatarImage src={mediaSrc(selectedTicket.userAvatarUrl)} alt="" className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-lg font-semibold text-primary">
                      {initials(selectedTicket.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{selectedTicket.userName || "—"}</p>
                    <p className="break-all text-sm text-muted-foreground">{selectedTicket.userEmail || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">معرّف المستخدم: {selectedTicket.userId}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    statusBadgeClass(selectedTicket.status),
                  )}
                >
                  {statusLabel(selectedTicket.status)}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    priorityBadgeClass(selectedTicket.priority),
                  )}
                >
                  أولوية: {priorityLabel(selectedTicket.priority)}
                </span>
                <span className="inline-flex rounded-full border border-primary/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-muted-foreground">
                  النوع: {categoryLabel(selectedTicket.category)}
                </span>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">عنوان الطلب</p>
                <p className="text-sm font-medium text-foreground">{selectedTicket.subject}</p>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">محتوى الطلب (أول رسالة)</p>
                {messagesQuery.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    جاري تحميل المحتوى...
                  </p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-red-300">تعذر تحميل نص الطلب من الرسائل</p>
                ) : initialMessageText ? (
                  <p className="text-sm leading-relaxed text-foreground">{initialMessageText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد رسائل مسجّلة لهذه التذكرة بعد.</p>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                <p className="w-full text-xs font-medium text-muted-foreground">تغيير الحالة</p>
                {(["open", "pending", "resolved"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={actionPending || selectedTicket.status === item}
                    onClick={() =>
                      patchMutation.mutate({
                        id: selectedTicket.id,
                        payload: { status: item },
                      })
                    }
                    className={cn(
                      ADMIN_ROW_ACTION_BASE,
                      item === "open" && "border-amber-500/45 bg-amber-600/12 text-amber-100",
                      item === "pending" && "border-primary/40 bg-primary/10 text-primary",
                      item === "resolved" && "border-emerald-500/45 bg-emerald-600/15 text-emerald-200",
                    )}
                  >
                    {item === "open" ? "مفتوحة" : item === "pending" ? "قيد المعالجة" : "تم الحل"}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={actionPending || selectedTicket.status === "closed"}
                  onClick={() => setPendingCloseConfirm(true)}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-200",
                  )}
                >
                  إغلاق التذكرة
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <p className="w-full text-xs font-medium text-muted-foreground">الأولوية</p>
                {(["low", "normal", "high", "urgent"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={actionPending || selectedTicket.priority === item}
                    onClick={() =>
                      patchMutation.mutate({
                        id: selectedTicket.id,
                        payload: { priority: item },
                      })
                    }
                    className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/25 bg-zinc-900/70 text-foreground hover:border-primary/40")}
                  >
                    {priorityLabel(item)}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                {selectedTicket.relatedAdId ? (
                  <>
                    <a
                      href={`/ad/${selectedTicket.relatedAdId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      صفحة الإعلان
                    </a>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ads?focusId=${selectedTicket.relatedAdId}`)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                    >
                      <Megaphone className="h-3.5 w-3.5" aria-hidden />
                      في لوحة الإعلانات
                    </button>
                  </>
                ) : null}
                {selectedTicket.relatedUserId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/users/${selectedTicket.relatedUserId}`)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    مستخدم مرتبط #{selectedTicket.relatedUserId}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate(`/admin/users/${selectedTicket.userId}`)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                >
                  <User className="h-3.5 w-3.5" aria-hidden />
                  صفحة المستخدم (صاحب التذكرة)
                </button>
              </div>

              <div className="rounded-2xl border border-primary/25 bg-zinc-900/40 p-4 ring-1 ring-primary/10">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
                  المحادثة
                </p>
                {messagesQuery.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    جاري تحميل الرسائل...
                  </p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-red-300">تعذر تحميل الرسائل</p>
                ) : sortedMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد رسائل بعد</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {sortedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-xl border p-3 text-sm ring-1",
                          msg.adminId
                            ? "border-primary/35 bg-primary/10 ring-primary/15"
                            : "border-primary/20 bg-zinc-900/70 ring-primary/5",
                        )}
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {msg.adminId ? "الإدارة" : "المستخدم"} ·{" "}
                          {formatTicketDate(msg.createdAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
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
                  placeholder="اكتب رد الإدارة هنا..."
                  className={cn(inputClass, "flex-1")}
                  aria-label="رد على التذكرة"
                />
                <button
                  type="submit"
                  disabled={replyMutation.isPending || !reply.trim()}
                  className={cn(buttonVariants(), BTN_SEARCH, "shrink-0 sm:min-w-[7rem]")}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden />
                      إرسال
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <AlertDialog open={pendingCloseConfirm} onOpenChange={setPendingCloseConfirm}>
        <AlertDialogContent
          dir="rtl"
          className="z-[100] max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">تأكيد إغلاق التذكرة</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              سيتم وضع التذكرة في حالة «مغلقة». يمكنك فتحها لاحقاً بتغيير الحالة إذا لزم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                BTN_MODAL_GHOST,
                "mt-0 bg-zinc-900/80 hover:bg-zinc-900",
              )}
            >
              إلغاء
            </AlertDialogCancel>
            <button
              type="button"
              disabled={patchMutation.isPending}
              title={patchMutation.isPending ? "جاري المعالجة..." : undefined}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                BTN_FIX,
                "inline-flex gap-2 rounded-2xl border-red-500/50 shadow-[0_0_18px_-10px_rgba(220,38,38,0.35)]",
              )}
              onClick={() => confirmCloseTicket()}
            >
              {patchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              إغلاق التذكرة
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

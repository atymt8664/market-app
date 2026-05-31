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
  assignAdminSupportTicket,
  claimAdminSupportTicket,
  releaseAdminSupportTicket,
  replyAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/features/admin/api";
import { toastAdminAction, toastAdminError } from "@/features/admin/admin-action-toast";
import { ModerationReasonDialog } from "@/features/admin/components/moderation-reason-dialog";
import { SlaStatusBadge } from "@/features/admin/components/sla-status-badge";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { StaffAssignDialog } from "@/features/admin/components/staff-assign-dialog";
import { StaffWorkflowPanel } from "@/features/admin/components/staff-workflow-panel";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { OperationsQueueTabBar } from "@/features/admin/components/operations-queue-tab-bar";
import {
  useAdminAccess,
  useAdminSupportMessages,
  useAdminSupportStats,
  useAdminSupportTickets,
  useRequireAdmin,
} from "@/features/admin/hooks";
import type { AdminPaginatedResult } from "@/features/admin/api";
import type { OpsQueueKey } from "@/features/admin/operations-queue-types";
import type { AdminSupportTicket } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { getLocale, t } from "@/i18n";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
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

const SUPPORT_STATUS_FILTER_KEYS = ["all", "open", "pending", "resolved", "closed"] as const;

function localeTag() {
  return getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";
}

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
  if (priority === "low") return t("p8.admin.support.priority_low");
  if (priority === "normal") return t("p8.admin.support.priority_normal");
  if (priority === "high") return t("p8.admin.support.priority_high");
  if (priority === "urgent") return t("p8.admin.support.priority_urgent");
  return priority;
}

function statusLabel(status: string) {
  if (status === "open") return t("p8.admin.support.status_open");
  if (status === "pending") return t("p8.admin.support.status_pending");
  if (status === "resolved") return t("p8.admin.support.status_resolved");
  if (status === "closed") return t("p8.admin.support.status_closed");
  return status;
}

function categoryLabel(category: string) {
  const map: Record<string, string> = {
    general: t("p8.admin.support.category_general"),
    login: t("p8.admin.support.category_login"),
    ad: t("p8.admin.support.category_ad"),
    payment: t("p8.admin.support.category_payment"),
    account: t("p8.admin.support.category_account"),
    other: t("p8.admin.support.category_other"),
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
  if (!iso) return t("p8.admin.common.dash");
  try {
    return new Date(iso).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

export default function AdminSupportPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [status, setStatus] = useState("all");
  const [queue, setQueue] = useState<OpsQueueKey>("all");
  const supportStatsQuery = useAdminSupportStats(!meQuery.isLoading);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [pendingCloseConfirm, setPendingCloseConfirm] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const statusOptions = useMemo(
    () =>
      SUPPORT_STATUS_FILTER_KEYS.map((key) => ({
        key,
        label: t(`p8.admin.support.filter_${key}` as "p8.admin.support.filter_all"),
      })),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [status, search, queue]);

  const workflowMutation = useMutation({
    mutationFn: async (action: { type: "claim" | "release"; id: number }) => {
      if (action.type === "claim") return claimAdminSupportTicket(action.id);
      return releaseAdminSupportTicket(action.id);
    },
    onSuccess: async (res, action) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
      toastAdminAction(
        toast,
        res,
        action.type === "claim" ? t("p8.admin.support.toast_claim") : t("p8.admin.support.toast_release"),
      );
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const ticketsQuery = useAdminSupportTickets({ status, q: search, queue, page, pageSize });
  const messagesQuery = useAdminSupportMessages(selectedTicket?.id ?? null);

  const tickets = ticketsQuery.data?.items ?? [];
  const pagination = ticketsQuery.data?.pagination;
  const visibleTickets = useMemo(() => tickets, [tickets]);

  const mergeTicketFromCache = useCallback(
    (ticketId: number) => {
      const list = queryClient.getQueryData<AdminPaginatedResult<AdminSupportTicket>>([
        "admin",
        "support",
        "tickets",
        status,
        search,
        queue,
        page,
        pageSize,
      ]);
      return list?.items?.find((t) => t.id === ticketId);
    },
    [queryClient, status, search, queue, page, pageSize],
  );

  const refresh = async (messageTicketId?: number | null) => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
    await queryClient.invalidateQueries({
      queryKey: ["admin", "support", "messages", messageTicketId ?? selectedTicket?.id ?? null],
    });
  };

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: number; staffId: number }) => assignAdminSupportTicket(id, staffId),
    onSuccess: async (res, variables) => {
      setAssignOpen(false);
      await refresh(variables.id);
      if (selectedTicket?.id === variables.id && res.assignment) {
        setSelectedTicket((prev) => (prev ? { ...prev, assignment: res.assignment } : prev));
      }
      toastAdminAction(toast, res, t("p8.admin.support.toast_assign"));
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        status?: "open" | "pending" | "resolved" | "closed";
        priority?: "low" | "normal" | "high" | "urgent";
        reason?: string;
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
        title: t("p8.admin.support.toast_updated"),
        description: t("p8.admin.support.toast_updated_desc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.support.toast_update_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.common.unexpected_error"),
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
        title: t("p8.admin.support.toast_reply_sent"),
        description: t("p8.admin.support.toast_reply_sent_desc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.support.toast_reply_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.common.unexpected_error"),
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

  const confirmCloseTicket = (reason: string) => {
    if (!selectedTicket) return;
    patchMutation.mutate(
      { id: selectedTicket.id, payload: { status: "closed", reason } },
      { onSettled: () => setPendingCloseConfirm(false) },
    );
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="support" onLogout={handleLogout}>
      <div className="space-y-6">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>{t("p8.admin.support.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("p8.admin.support.subtitle")}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Headphones className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("p8.admin.support.list_count", {
              count: (pagination?.totalItems ?? visibleTickets.length).toLocaleString(localeTag()),
            })}
          </span>
        </header>

        <OperationsQueueTabBar queue={queue} counts={supportStatsQuery.data ?? undefined} onChange={setQueue} />

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
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
                  placeholder={t("p8.admin.support.search_placeholder")}
                  className={cn(inputClass, "pr-10")}
                  aria-label={t("p8.admin.support.search_aria")}
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                {t("p8.admin.common.search")}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((item) => (
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
            <AdminPageLoading message={t("p8.admin.support.loading")} />
          ) : ticketsQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.support.load_error")}
              description={t("p8.admin.support.load_error_hint")}
              onRetry={() => ticketsQuery.refetch()}
            />
          ) : visibleTickets.length === 0 ? (
            <AdminEmptyState title={t("p8.admin.support.empty_title")} description={t("p8.admin.support.empty_body")} />
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-primary/25 bg-zinc-900/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_id")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_user")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_category")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_subject")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_status")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_sla")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_priority")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.support.col_date")}</th>
                    <th className="px-3 py-3 text-center font-medium">{t("p8.admin.support.col_actions")}</th>
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
                            <p className="line-clamp-1 font-medium text-foreground">{ticket.userName || t("p8.admin.common.dash")}</p>
                            <p className="text-[11px] text-muted-foreground">{ticket.userEmail || t("p8.admin.common.dash")}</p>
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
                        {ticket.slaState ? (
                          <SlaStatusBadge state={ticket.slaState} minutesRemaining={ticket.slaMinutesRemaining} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("p8.admin.common.dash")}</span>
                        )}
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
                          {t("p8.admin.common.details")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AdminPaginationBar
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            isLoading={ticketsQuery.isFetching}
          />
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
             
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="admin-support-detail-title" className="text-xl font-semibold text-foreground">
                    {t("p8.admin.support.detail_title", { id: selectedTicket.id })}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTicketDate(selectedTicket.createdAt)}
                    {selectedTicket.updatedAt ? (
                      <span className="mr-2 text-[13px]">
                        {t("p8.admin.support.detail_last_updated", { date: formatTicketDate(selectedTicket.updatedAt) })}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeTicketModal()}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST, "shrink-0")}
                >
                  {t("p8.admin.common.close")}
                </button>
              </div>

              <div className={cn(CARD_SHELL, "mb-4 p-4")}>
                <p className="mb-3 text-xs font-medium text-muted-foreground">{t("p8.admin.support.detail_user")}</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border border-primary/30 ring-1 ring-primary/10">
                    <AvatarImage src={mediaSrc(selectedTicket.userAvatarUrl)} alt="" className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-lg font-semibold text-primary">
                      {initials(selectedTicket.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{selectedTicket.userName || t("p8.admin.common.dash")}</p>
                    <p className="break-all text-sm text-muted-foreground">{selectedTicket.userEmail || t("p8.admin.common.dash")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("p8.admin.support.detail_user_id", { id: selectedTicket.userId })}
                    </p>
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
                  {t("p8.admin.support.detail_priority", { priority: priorityLabel(selectedTicket.priority) })}
                </span>
                <span className="inline-flex rounded-full border border-primary/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {t("p8.admin.support.detail_type", { category: categoryLabel(selectedTicket.category) })}
                </span>
              </div>

              <div className="mb-4">
                <StaffWorkflowPanel
                  assignment={selectedTicket.assignment}
                  busy={workflowMutation.isPending || assignMutation.isPending}
                  canAssign={access.isFounder}
                  onAssign={() => setAssignOpen(true)}
                  onClaim={() => workflowMutation.mutate({ type: "claim", id: selectedTicket.id })}
                  onRelease={() => workflowMutation.mutate({ type: "release", id: selectedTicket.id })}
                />
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.support.section_request_subject")}</p>
                <p className="text-sm font-medium text-foreground">{selectedTicket.subject}</p>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.support.section_first_message")}</p>
                {messagesQuery.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {t("p8.admin.support.messages_loading")}
                  </p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-red-300">{t("p8.admin.support.messages_load_error")}</p>
                ) : initialMessageText ? (
                  <p className="text-sm leading-relaxed text-foreground">{initialMessageText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("p8.admin.support.messages_empty")}</p>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                <p className="w-full text-xs font-medium text-muted-foreground">{t("p8.admin.support.section_change_status")}</p>
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
                    {statusLabel(item)}
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
                  {t("p8.admin.support.close_ticket")}
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <p className="w-full text-xs font-medium text-muted-foreground">{t("p8.admin.support.section_priority")}</p>
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
                      {t("p8.admin.support.link_ad_page")}
                    </a>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ads?focusId=${selectedTicket.relatedAdId}`)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                    >
                      <Megaphone className="h-3.5 w-3.5" aria-hidden />
                      {t("p8.admin.support.link_admin_ads")}
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
                    {t("p8.admin.support.link_related_user", { id: selectedTicket.relatedUserId })}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate(`/admin/users/${selectedTicket.userId}`)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST)}
                >
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {t("p8.admin.support.link_ticket_owner")}
                </button>
              </div>

              <div className="rounded-2xl border border-primary/25 bg-zinc-900/40 p-4 ring-1 ring-primary/10">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
                  {t("p8.admin.support.section_conversation")}
                </p>
                {messagesQuery.isLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {t("p8.admin.support.messages_loading_thread")}
                  </p>
                ) : messagesQuery.isError ? (
                  <p className="text-sm text-red-300">{t("p8.admin.support.messages_thread_error")}</p>
                ) : sortedMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("p8.admin.support.messages_thread_empty")}</p>
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
                          {msg.adminId ? t("p8.admin.support.message_from_admin") : t("p8.admin.support.message_from_user")} ·{" "}
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
                  placeholder={t("p8.admin.support.reply_placeholder")}
                  className={cn(inputClass, "flex-1")}
                  aria-label={t("p8.admin.support.reply_aria")}
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
                      {t("p8.admin.support.send")}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <StaffAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={t("p8.admin.support.assign_title")}
        description={t("p8.admin.support.assign_description")}
        currentAssignee={selectedTicket?.assignment?.staffName}
        busy={assignMutation.isPending}
        onConfirm={(staffActorId) => {
          if (!selectedTicket) return;
          assignMutation.mutate({ id: selectedTicket.id, staffId: staffActorId });
        }}
      />

      <ModerationReasonDialog
        open={pendingCloseConfirm}
        onOpenChange={setPendingCloseConfirm}
        title={t("p8.admin.support.close_reason_title")}
        description={t("p8.admin.moderation.reason_hint")}
        confirmLabel={t("p8.admin.support.close_confirm_label")}
        onConfirm={confirmCloseTicket}
      />
    </AdminShell>
  );
}

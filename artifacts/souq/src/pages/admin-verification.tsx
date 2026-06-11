import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Hand,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";
import {
  adminLogout,
  assignAdminVerificationRequest,
  claimAdminVerificationRequest,
  escalateAdminVerificationRequest,
  releaseAdminVerificationRequest,
  updateAdminVerificationStatus,
} from "@/features/admin/api";
import { toastAdminAction, toastAdminError } from "@/features/admin/admin-action-toast";
import { SlaStatusBadge } from "@/features/admin/components/sla-status-badge";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  CARD_SHELL,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { ModerationReasonDialog } from "@/features/admin/components/moderation-reason-dialog";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import { StaffAssignDialog } from "@/features/admin/components/staff-assign-dialog";
import { StaffWorkflowPanel } from "@/features/admin/components/staff-workflow-panel";
import {
  useAdminAccess,
  useAdminVerificationDetail,
  useAdminVerificationRequests,
  useAdminVerificationStats,
  useRequireAdmin,
} from "@/features/admin/hooks";
import type { VerificationRequest, VerificationRequestDetail } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { formatAdminDateTime } from "@/features/admin/admin-locale";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { p10PreviewAttrs, p8VerificationOpsAttrs } from "@/lib/monetization-boundary";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { OperationsQueueTabBar } from "@/features/admin/components/operations-queue-tab-bar";
import type { OpsQueueKey } from "@/features/admin/operations-queue-types";

const VERIFICATION_STATUS_FILTER_KEYS = ["all", "pending", "approved", "rejected"] as const;
type VerificationStatusFilterKey = (typeof VERIFICATION_STATUS_FILTER_KEYS)[number];

function isVerificationStatusFilterKey(value: string): value is VerificationStatusFilterKey {
  return (VERIFICATION_STATUS_FILTER_KEYS as readonly string[]).includes(value);
}

function mediaSrc(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").slice(0, 2);
}

function formatDate(iso: string | null) {
  if (!iso) return t("p8.admin.common.dash");
  try {
    return formatAdminDateTime(iso, getLocale(), { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function typeLabel(type: string) {
  const key = `p8.admin.verification.type_${type}` as const;
  const translated = t(key);
  return translated === key ? type : translated;
}

function statusLabel(status: string) {
  const key = `p8.admin.verification.status_${status}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function statusBadgeClass(status: string) {
  if (status === "pending" || status === "needs_info") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "under_review") return "border-primary/45 bg-primary/15 text-primary";
  if (status === "approved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected") return "border-red-500/45 bg-red-500/15 text-red-200";
  return "border-zinc-600 bg-zinc-900/70 text-zinc-300";
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    claim: t("p8.admin.workflow.claim"),
    assign: t("p8.admin.workflow.assign_staff"),
    release: t("p8.admin.workflow.release"),
    escalate: t("p8.admin.verification.escalate"),
    approved: t("p8.admin.verification.approve"),
    rejected: t("p8.admin.verification.reject"),
    needs_info: t("p8.admin.verification.needs_info"),
    approve: t("p8.admin.verification.approve"),
    reject: t("p8.admin.verification.reject"),
  };
  return map[action] ?? action;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "amber" | "primary" | "green" | "red";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/35 bg-amber-950/20"
      : tone === "primary"
        ? "border-primary/35 bg-primary/10"
        : tone === "green"
          ? "border-emerald-500/35 bg-emerald-950/20"
          : tone === "red"
            ? "border-red-500/35 bg-red-950/20"
            : "border-zinc-700/60 bg-zinc-950/50";
  return (
    <div className={cn(SUB_CARD, toneClass, "p-4 text-right")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function RequestDetailPanel({
  detail,
  onClose,
  onRefresh,
  busy,
  onClaim,
  onRelease,
  onAssign,
  canAssign,
  onApprove,
  onReject,
  onNeedsInfo,
  onEscalate,
}: {
  detail: VerificationRequestDetail;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  busy: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onAssign?: () => void;
  canAssign?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onNeedsInfo: () => void;
  onEscalate: () => void;
}) {
  const photos = detail.documents.filter((d) => d.kind === "photo" || d.kind === "image");
  const documents = detail.documents.filter((d) => d.kind !== "photo" && d.kind !== "image");
  const isTerminal = detail.status === "approved" || detail.status === "rejected";

  return (
    <section className={cn(CARD_SHELL, "space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-right">
          <h2 className="text-lg font-semibold text-foreground">
            {t("p8.admin.verification.detail_title", { id: detail.id })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {typeLabel(detail.type)} · {detail.userName ?? t("p8.admin.common.dash")}
          </p>
        </div>
        <button type="button" onClick={onClose} className={cn(BTN_MODAL_GHOST, "px-3 py-2 text-sm")}>
          {t("p8.admin.common.close")}
        </button>
      </div>

      <StaffWorkflowPanel
        assignment={detail.assignment}
        onClaim={onClaim}
        onRelease={onRelease}
        onAssign={onAssign}
        canAssign={canAssign}
        busy={busy}
      />

      {detail.escalatedAt ? (
        <div className="rounded-xl border border-orange-500/35 bg-orange-950/20 px-3 py-2.5 text-right text-sm text-orange-100">
          <p className="font-medium">
            {t("p8.admin.verification.escalated_by", {
              by: detail.escalatedByName
                ? t("p8.admin.verification.escalated_by_name", { name: detail.escalatedByName })
                : "",
            })}
          </p>
          {detail.escalationNote ? <p className="mt-1 text-orange-100/85">{detail.escalationNote}</p> : null}
        </div>
      ) : null}

      {!isTerminal ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={onApprove} className={cn(BTN_FIX, "border-emerald-500/40 text-emerald-200")}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("p8.admin.verification.approve")}
          </button>
          <button type="button" disabled={busy} onClick={onReject} className={cn(BTN_FIX, "border-red-500/40 text-red-200")}>
            <XCircle className="h-4 w-4" aria-hidden />
            {t("p8.admin.verification.reject")}
          </button>
          <button type="button" disabled={busy} onClick={onNeedsInfo} className={cn(BTN_FIX, "border-amber-500/40 text-amber-200")}>
            <FileText className="h-4 w-4" aria-hidden />
            {t("p8.admin.verification.needs_info")}
          </button>
          {!detail.escalatedAt ? (
            <button type="button" disabled={busy} onClick={onEscalate} className={cn(BTN_FIX, "border-orange-500/40 text-orange-200")}>
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {t("p8.admin.verification.escalate")}
            </button>
          ) : null}
        </div>
      ) : null}

      {detail.notes ? (
        <div className={SUB_CARD}>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("p8.admin.verification.notes")}</p>
          <p className="text-sm leading-relaxed text-foreground">{detail.notes}</p>
        </div>
      ) : null}

      {detail.rejectionReason ? (
        <div className={SUB_CARD}>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("p8.admin.verification.rejection_reason")}</p>
          <p className="text-sm leading-relaxed text-red-200">{detail.rejectionReason}</p>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
            {t("p8.admin.verification.photos")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((doc) => (
              <a
                key={doc.id}
                href={mediaSrc(doc.url)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-primary/25 bg-zinc-950/60"
              >
                <img src={mediaSrc(doc.url)} alt={doc.label ?? t("p8.admin.verification.image_alt")} className="aspect-[4/3] w-full object-cover" />
                {doc.label ? <p className="px-2 py-1.5 text-xs text-muted-foreground">{doc.label}</p> : null}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            {t("p8.admin.verification.documents")}
          </h3>
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={mediaSrc(doc.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/25 px-3 py-2 text-sm text-primary hover:bg-primary/10"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  {doc.label ?? t("p8.admin.verification.document_fallback", { id: doc.id })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">{t("p8.admin.verification.activity_log")}</h3>
        {detail.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("p8.admin.verification.no_activity")}</p>
        ) : (
          <ul className="space-y-2">
            {detail.activity.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-right text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{actionLabel(entry.action)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatDate(entry.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{entry.actorName ?? t("p8.admin.verification.system_actor")}</p>
                {entry.details ? <p className="mt-1 text-xs text-zinc-300">{entry.details}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" disabled={busy} onClick={() => void onRefresh()} className={cn(BTN_FIX, "w-full sm:w-auto")}>
        {t("p8.admin.verification.refresh_detail")}
      </button>
    </section>
  );
}

export default function AdminVerificationPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const initialQueue = (params.get("queue") || "all") as OpsQueueKey;
  const statusRaw = (params.get("status") || "all").trim().toLowerCase();
  const initialStatus: VerificationStatusFilterKey = isVerificationStatusFilterKey(statusRaw)
    ? statusRaw
    : "all";
  const initialRequestId = Number(params.get("requestId") || 0);

  const [queue, setQueue] = useState(initialQueue);
  const [status, setStatus] = useState<VerificationStatusFilterKey>(initialStatus);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isInteger(initialRequestId) && initialRequestId > 0 ? initialRequestId : null,
  );
  const [reasonDialog, setReasonDialog] = useState<
    | null
    | { kind: "reject"; id: number }
    | { kind: "needs_info"; id: number }
    | { kind: "escalate"; id: number }
  >(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const adminReady = meQuery.isSuccess;
  const statsQuery = useAdminVerificationStats(adminReady);
  const requestsQuery = useAdminVerificationRequests({ queue, status, page, pageSize }, adminReady);
  const detailQuery = useAdminVerificationDetail(selectedId, adminReady);

  const statusFilters = useMemo(
    () =>
      VERIFICATION_STATUS_FILTER_KEYS.map((key) => ({
        key,
        label: t(`p8.admin.verification.filter_${key}` as "p8.admin.verification.filter_all"),
      })),
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [queue, status]);

  useEffect(() => {
    if (!adminReady) return;
    void queryClient.invalidateQueries({ queryKey: ["admin", "verification", "requests"] });
  }, [adminReady, queryClient]);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "verification"] }),
    ]);
  }, [queryClient]);

  const workflowMutation = useMutation({
    mutationFn: async (action: { type: "claim" | "release"; id: number }) => {
      if (action.type === "claim") return claimAdminVerificationRequest(action.id);
      return releaseAdminVerificationRequest(action.id);
    },
    onSuccess: async (res, action) => {
      await refresh();
      toastAdminAction(
        toast,
        res as Record<string, unknown>,
        action.type === "claim" ? t("p8.admin.verification.toast_claimed") : t("p8.admin.verification.toast_released"),
      );
    },
    onError: (err) => toastAdminError(toast, err),
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      status: VerificationRequest["status"];
      reason?: string;
      notes?: string;
    }) => updateAdminVerificationStatus(payload.id, payload.status, {
      reason: payload.reason,
      notes: payload.notes,
    }),
    onSuccess: async () => {
      await refresh();
      toast({ title: t("p8.admin.verification.toast_status_updated") });
    },
    onError: (err) => toastAdminError(toast, err),
  });

  const escalateMutation = useMutation({
    mutationFn: async (payload: { id: number; note?: string }) =>
      escalateAdminVerificationRequest(payload.id, payload.note),
    onSuccess: async () => {
      await refresh();
      toast({ title: t("p8.admin.verification.toast_escalated") });
    },
    onError: (err) => toastAdminError(toast, err),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: number; staffId: number }) => assignAdminVerificationRequest(id, staffId),
    onSuccess: async (res) => {
      setAssignOpen(false);
      await refresh();
      toastAdminAction(toast, res as Record<string, unknown>, t("p8.admin.verification.toast_assigned"));
    },
    onError: (err) => toastAdminError(toast, err),
  });

  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    if (queue && queue !== "all") next.set("queue", queue);
    else next.delete("queue");
    if (status !== "all") next.set("status", status);
    else next.delete("status");
    if (selectedId) next.set("requestId", String(selectedId));
    else next.delete("requestId");
    const qs = next.toString();
    const path = `/admin/verification${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", path);
  }, [queue, status, selectedId]);

  const stats = statsQuery.data;
  const requests = requestsQuery.data?.items ?? [];
  const pagination = requestsQuery.data?.pagination;
  const detail = detailQuery.data;
  const busy =
    workflowMutation.isPending ||
    statusMutation.isPending ||
    escalateMutation.isPending ||
    assignMutation.isPending;

  const filteredRequests = useMemo(() => requests, [requests]);

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.verification.loading")} />
      </div>
    );
  }

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  return (
    <AdminShell activeKey="verification" onLogout={onLogout}>
      <div className="space-y-5" {...p10PreviewAttrs("admin.verification_ops")} {...p8VerificationOpsAttrs()}>
        <header className="space-y-2 text-right">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] ring-1 ring-primary/15">
              <BadgeCheck className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("p8.admin.verification.title")}</h1>
              <p className="text-sm leading-relaxed text-zinc-400">
                {access.roleKey === "verification"
                  ? t("p8.admin.verification.subtitle_staff")
                  : access.roleKey === "moderator"
                    ? t("p8.admin.verification.subtitle_moderator")
                    : t("p8.admin.verification.subtitle")}
              </p>
            </div>
          </div>
        </header>

        <p
          role="status"
          className="rounded-2xl border border-sky-500/30 bg-sky-950/20 px-3 py-2.5 text-right text-[13px] leading-relaxed text-sky-100/90"
        >
          {t("p8.admin.verification.boundary_user_submit")}
        </p>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t("p8.admin.verification.stats_total")} value={stats?.total ?? 0} tone="default" />
          <StatCard label={t("p8.admin.verification.stats_pending")} value={stats?.pendingReview ?? 0} tone="amber" />
          <StatCard label={t("p8.admin.verification.stats_under_review")} value={stats?.underReview ?? 0} tone="primary" />
          <StatCard label={t("p8.admin.verification.stats_approved")} value={stats?.approved ?? 0} tone="green" />
          <StatCard label={t("p8.admin.verification.stats_rejected")} value={stats?.rejected ?? 0} tone="red" />
        </section>

        <OperationsQueueTabBar queue={queue as OpsQueueKey} counts={stats ?? undefined} onChange={setQueue} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("p8.admin.verification.label_status")}</span>
          {statusFilters.map((item) => (
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

        {requestsQuery.isError ? (
          <AdminErrorState
            title={t("p8.admin.verification.load_error")}
            description={t("p8.admin.verification.load_error_hint")}
            onRetry={() => void requestsQuery.refetch()}
          />
        ) : (
        <section className={SURFACE_TABLE_WRAP}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-right text-sm">
              <thead>
                <tr className="border-b border-primary/20 text-xs text-muted-foreground">
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_user")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_type")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_status")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_sla")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_staff")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_created")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_updated")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.verification.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6">
                      <AdminPageLoading message={t("p8.admin.verification.loading")} className="border-0 bg-transparent py-6 shadow-none ring-0" />
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6">
                      <AdminEmptyState
                        title={t("p8.admin.verification.empty_title")}
                        description={t("p8.admin.verification.empty_queue")}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className={cn(
                        ADMIN_TABLE_ROW,
                        selectedId === request.id && "bg-primary/8 ring-1 ring-primary/20",
                      )}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 shrink-0 border border-primary/25">
                            <AvatarImage src={mediaSrc(request.userAvatarUrl)} alt="" className="object-cover" />
                            <AvatarFallback className="bg-zinc-800 text-[10px] text-primary">{initials(request.userName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium text-foreground">{request.userName ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{request.userEmail ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {request.isUrgent ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden /> : null}
                          {typeLabel(request.type)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadgeClass(request.status))}>
                          {statusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {request.slaState ? (
                          <SlaStatusBadge state={request.slaState} minutesRemaining={request.slaMinutesRemaining} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {request.assignment?.staffName ?? t("p8.admin.workflow.unassigned")}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatDate(request.createdAt)}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatDate(request.updatedAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/35 text-primary")}
                            onClick={() => setSelectedId(request.id)}
                          >
                            {t("p8.admin.common.details")}
                          </button>
                          {!request.assignment?.staffId &&
                          request.status !== "approved" &&
                          request.status !== "rejected" ? (
                            <button
                              type="button"
                              disabled={busy}
                              className={cn(ADMIN_ROW_ACTION_BASE, "border-emerald-500/35 text-emerald-200")}
                              onClick={() => workflowMutation.mutate({ type: "claim", id: request.id })}
                            >
                              <Hand className="h-3.5 w-3.5" aria-hidden />
                              {t("p8.admin.workflow.claim")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AdminPaginationBar
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            isLoading={requestsQuery.isFetching}
            className="rounded-none border-0 shadow-none ring-0"
          />
        </section>
        )}

        {selectedId && detail ? (
          <RequestDetailPanel
            detail={detail}
            onClose={() => setSelectedId(null)}
            onRefresh={refresh}
            busy={busy}
            canAssign={access.isFounder}
            onAssign={() => setAssignOpen(true)}
            onClaim={() => workflowMutation.mutate({ type: "claim", id: detail.id })}
            onRelease={() => workflowMutation.mutate({ type: "release", id: detail.id })}
            onApprove={() => statusMutation.mutate({ id: detail.id, status: "approved" })}
            onReject={() => setReasonDialog({ kind: "reject", id: detail.id })}
            onNeedsInfo={() => setReasonDialog({ kind: "needs_info", id: detail.id })}
            onEscalate={() => setReasonDialog({ kind: "escalate", id: detail.id })}
          />
        ) : selectedId && detailQuery.isLoading ? (
          <AdminPageLoading message={t("p8.admin.verification.loading")} />
        ) : null}

        <StaffAssignDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          title={t("p8.admin.verification.assign_title")}
          description={t("p8.admin.verification.assign_description")}
          currentAssignee={detail?.assignment?.staffName}
          busy={assignMutation.isPending}
          onConfirm={(staffActorId) => {
            if (!selectedId) return;
            assignMutation.mutate({ id: selectedId, staffId: staffActorId });
          }}
        />

        <ModerationReasonDialog
          open={reasonDialog?.kind === "reject"}
          onOpenChange={(open) => !open && setReasonDialog(null)}
          presetContext="verification"
          title={t("p8.admin.verification.reject_reason_title")}
          description={t("p8.admin.verification.reject_description")}
          confirmLabel={t("p8.admin.verification.reject_confirm")}
          onConfirm={(reason) => {
            if (reasonDialog?.kind === "reject") {
              statusMutation.mutate({ id: reasonDialog.id, status: "rejected", reason });
              setReasonDialog(null);
            }
          }}
        />

        {reasonDialog?.kind === "needs_info" ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
            <div className={cn(CARD_SHELL, "w-full max-w-md space-y-4")}>
              <h3 className="text-right text-lg font-semibold text-foreground">{t("p8.admin.verification.needs_info_title")}</h3>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-primary/25 bg-zinc-950 px-3 py-2 text-right text-sm text-foreground"
                placeholder={t("p8.admin.verification.needs_info_placeholder")}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={cn(BTN_MODAL_GHOST, "px-3 py-2 text-sm")} onClick={() => { setReasonDialog(null); setNotesDraft(""); }}>
                  {t("p8.admin.common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={busy || !notesDraft.trim()}
                  className={cn(BTN_MODAL_PRIMARY, "px-3 py-2 text-sm")}
                  onClick={() => {
                    statusMutation.mutate({ id: reasonDialog.id, status: "needs_info", notes: notesDraft.trim() });
                    setReasonDialog(null);
                    setNotesDraft("");
                  }}
                >
                  {t("p8.admin.verification.send")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {reasonDialog?.kind === "escalate" ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
            <div className={cn(CARD_SHELL, "w-full max-w-md space-y-4")}>
              <h3 className="text-right text-lg font-semibold text-foreground">{t("p8.admin.verification.escalate_title")}</h3>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-primary/25 bg-zinc-950 px-3 py-2 text-right text-sm text-foreground"
                placeholder={t("p8.admin.verification.escalate_placeholder")}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={cn(BTN_MODAL_GHOST, "px-3 py-2 text-sm")} onClick={() => { setReasonDialog(null); setNotesDraft(""); }}>
                  {t("p8.admin.common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={cn(BTN_MODAL_PRIMARY, "px-3 py-2 text-sm")}
                  onClick={() => {
                    escalateMutation.mutate({ id: reasonDialog.id, note: notesDraft.trim() || undefined });
                    setReasonDialog(null);
                    setNotesDraft("");
                  }}
                >
                  {t("p8.admin.verification.escalate")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

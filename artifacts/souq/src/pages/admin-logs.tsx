import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { RefreshCw, ScrollText, Search } from "lucide-react";
import { adminLogout, getAdminLogs } from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  BTN_TOOLBAR_OUTLINE,
  CARD_SHELL,
  INPUT_FIELD,
  SUB_CARD,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminScrollableTable } from "@/features/admin/components/admin-scrollable-table";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useRequireAdmin } from "@/features/admin/hooks";
import type { AdminActivityLog } from "@/features/admin/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const ACTION_TYPE_KEYS = [
  "all",
  "ad",
  "report",
  "support",
  "user",
  "category",
  "city",
  "verification",
  "staff",
  "settings",
  "monitoring",
] as const;

const TARGET_TYPE_KEYS = [
  "all",
  "ad",
  "report",
  "support_ticket",
  "user",
  "category",
  "city",
  "verification_request",
  "system",
] as const;

const DETAIL_FIELD_I18N: Record<string, string> = {
  fromStatus: "p8.admin.logs.from_date_label",
  toStatus: "p8.admin.logs.to_date_label",
  fromHidden: "p8.admin.cities.col_status",
  toHidden: "p8.admin.cities.col_status",
  entityType: "p8.admin.logs.target_type_label",
  name: "p8.admin.categories.name",
  slug: "p8.admin.categories.slug",
  parentCategoryId: "p8.admin.categories.parent_category",
  reportId: "p8.admin.logs.th_target_id",
  targetAdId: "p8.admin.ads.col_id",
  adAction: "p8.admin.logs.th_action_type",
  fromPriority: "p8.admin.categories.sort",
  toPriority: "p8.admin.categories.sort",
  targetType: "p8.admin.logs.target_type_label",
  targetId: "p8.admin.logs.th_target_id",
  reason: "p8.admin.logs.field_reason",
  deepLink: "p8.admin.logs.field_deep_link",
  roleKey: "p8.admin.logs.field_role",
  actionKey: "p8.admin.logs.th_action_type",
  previousState: "p8.admin.logs.field_previous_state",
  newState: "p8.admin.logs.field_new_state",
};

const AD_STATUS_KEYS: Record<string, string> = {
  pending: "p8.admin.ads.status_pending",
  approved: "p8.admin.ads.status_approved",
  rejected: "p8.admin.ads.status_rejected",
  hidden: "p8.admin.ads.status_hidden",
};

const REPORT_STATUS_KEYS: Record<string, string> = {
  pending: "p8.admin.reports.status_open",
  in_review: "p8.admin.reports.status_under_review",
  resolved: "p8.admin.reports.status_resolved",
  rejected: "p8.admin.reports.status_rejected",
};

const SUPPORT_STATUS_KEYS: Record<string, string> = {
  open: "p8.admin.support.status_open",
  pending: "p8.admin.support.status_pending",
  in_progress: "p8.admin.support.status_pending",
  resolved: "p8.admin.support.status_resolved",
  closed: "p8.admin.support.status_closed",
};

const MAX_TABLE_SUMMARY = 160;

function formatActorCell(log: AdminActivityLog): string {
  const name = log.actorDisplayName?.trim() || log.actor?.trim();
  if (!name) return t("p8.admin.common.dash");
  if (log.actorRoleKey) {
    const roleKey = `p8.admin.roles.${log.actorRoleKey}.title`;
    const roleLabel = t(roleKey);
    if (roleLabel !== roleKey && log.actorRoleKey !== "founder") {
      return `${name} · ${roleLabel}`;
    }
  }
  return name;
}

function formatRoleKeyLabel(roleKey: string): string {
  const key = `p8.admin.roles.${roleKey}.title`;
  const label = t(key);
  return label === key ? roleKey : label;
}

function actionLabelKey(actionKey: string): string {
  return `p8.admin.logs.action.${actionKey}`;
}

function getActionLabel(actionKey: string): string {
  const key = actionLabelKey(actionKey);
  const label = t(key);
  return label === key ? actionKey : label;
}

function getActionFallbackSummary(actionKey: string): string {
  const key = actionLabelKey(actionKey);
  const label = t(key);
  return label === key ? t("p8.admin.logs.fallback_unknown") : label;
}

/** يكتشف سلاسل الترميز التالفة: ???? ، Cursor ???? ، استبدال Unicode ، إلخ */
function containsUnreadableGarbage(s: string): boolean {
  const trimmed = (s ?? "").trim();
  if (!trimmed) return false;
  if (/\uFFFD/.test(trimmed)) return true;
  if (/\?{3,}/.test(trimmed)) return true;
  if (/cursor\s*[؟?]{2,}/i.test(trimmed)) return true;
  if (/cursor\s*\?+/i.test(trimmed)) return true;
  const compact = trimmed.replace(/\s/g, "");
  if (compact.length > 0 && /^[؟?]+$/.test(compact)) return true;
  const qMarks = (trimmed.match(/\?/g) ?? []).length;
  const arabicQ = (trimmed.match(/؟/g) ?? []).length;
  const loudQs = qMarks + arabicQ;
  if (compact.length > 3 && loudQs / compact.length > 0.2) return true;
  return false;
}

/** للعرض التقني الاختياري فقط — لا يُستخدم في خلايا الجدول */
function sanitizeTechnicalBlob(s: string): string {
  return (s ?? "")
    .replace(/\uFFFD/g, "[…]")
    .replace(/\?{2,}/g, "[…]")
    .replace(/؟{2,}/g, "[…]");
}

function looksLikeJsonObjectString(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** محاولة إصلاح نص UTF-8 أُسيء فهمها كـ Latin-1 (أحرف مثل Ã، Ø) */
function tryRecoverUtf8Mojibake(s: string): string {
  if (!s) return s;
  const hasMojibakeSignature = /[ÃÂÐØæÆß]/.test(s);
  const highQuestionRatio = (s.match(/\?/g)?.length ?? 0) / Math.max(s.length, 1) > 0.08;
  if (!hasMojibakeSignature && !highQuestionRatio) return s;
  try {
    const recovered = decodeURIComponent(escape(s));
    if (recovered !== s && /[\u0600-\u06FF]/.test(recovered)) return recovered;
  } catch {
    /* ignore */
  }
  return s;
}

/** إصلاح ترميز فقط — بدون دمج مسافات داخل النص حتى لا يُفسد JSON */
function normalizeDetailTextLoose(s: string): string {
  let trimmed = (s ?? "").trim();
  trimmed = tryRecoverUtf8Mojibake(trimmed);
  return trimmed.replace(/\uFFFD/g, " ");
}

function normalizeDetailText(s: string): string {
  return normalizeDetailTextLoose(s).replace(/\s+/g, " ").trim();
}

function parseDetailsJson(raw: string): Record<string, unknown> | null {
  const trimmed = normalizeDetailTextLoose(raw).trim();
  if (!trimmed || !looksLikeJsonObjectString(trimmed)) return null;
  try {
    const v = JSON.parse(trimmed) as unknown;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatStatusForAction(actionKey: string, status: string): string {
  const root = actionKey.split(".")[0];
  if (root === "report" || actionKey.includes("report")) {
    const key = REPORT_STATUS_KEYS[status];
    if (key) return t(key);
    const adKey = AD_STATUS_KEYS[status];
    if (adKey) return t(adKey);
    return status;
  }
  if (root === "support") {
    const key = SUPPORT_STATUS_KEYS[status];
    return key ? t(key) : status;
  }
  const adKey = AD_STATUS_KEYS[status];
  return adKey ? t(adKey) : status;
}

function detailFieldLabel(key: string): string {
  const i18nKey = DETAIL_FIELD_I18N[key];
  if (i18nKey) return t(i18nKey);
  return key.replace(/_/g, " ");
}

function formatPrimitiveForDisplay(key: string, value: unknown, actionKey: string): string {
  if (value === null || value === undefined) return t("p8.admin.common.dash");
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "number") return value.toLocaleString("ar-EG");
  if (typeof value !== "string") {
    try {
      const js = JSON.stringify(value, null, 2);
      return containsUnreadableGarbage(js) ? t("p8.admin.common.dash") : js;
    } catch {
      return String(value);
    }
  }
  let s = normalizeDetailText(value);
  if (containsUnreadableGarbage(s)) return t("p8.admin.common.dash");
  if (/status/i.test(key) || key === "fromStatus" || key === "toStatus") {
    return formatStatusForAction(actionKey, s);
  }
  if (key === "roleKey") {
    return formatRoleKeyLabel(s);
  }
  return s || t("p8.admin.common.dash");
}

/** ملخص سطر واحد للجدول — لا يعرض JSON خام ولا ???? */
function buildTableSummary(actionKey: string, detailsRaw: string): string {
  const fb = () => getActionFallbackSummary(actionKey);
  const loose = normalizeDetailTextLoose(detailsRaw ?? "").trim();
  if (!loose) return fb();

  if (containsUnreadableGarbage(loose)) {
    return fb();
  }

  const parsed = parseDetailsJson(detailsRaw);
  if (parsed) {
    const chunks: string[] = [];

    const entity = parsed.entityType;
    if (entity === "category") chunks.push(t("p8.admin.logs.filter.target.category"));
    else if (entity === "subcategory") chunks.push(t("p8.admin.categories.add_subcategory"));
    else if (entity === "city") chunks.push(t("p8.admin.logs.filter.target.city"));

    if (typeof parsed.name === "string" && parsed.name.trim()) {
      const nm = parsed.name.trim();
      if (!containsUnreadableGarbage(nm)) chunks.push(nm);
    }

    if (parsed.fromStatus != null && parsed.toStatus != null) {
      const a = String(parsed.fromStatus);
      const b = String(parsed.toStatus);
      chunks.push(
        `${formatStatusForAction(actionKey, a)} → ${formatStatusForAction(actionKey, b)}`,
      );
    } else if (parsed.fromHidden != null && parsed.toHidden != null) {
      chunks.push(
        `${parsed.fromHidden ? t("p8.admin.cities.status_hidden") : t("p8.admin.cities.status_visible")} → ${parsed.toHidden ? t("p8.admin.cities.status_hidden") : t("p8.admin.cities.status_visible")}`,
      );
    }

    if (typeof parsed.reportId === "number") {
      chunks.push(
        t("p8.admin.activity.actions.report_created", {
          id: parsed.reportId.toLocaleString("ar-EG"),
        }),
      );
    }
    if (typeof parsed.reason === "string" && parsed.reason.trim()) {
      const reason = parsed.reason.trim();
      if (!containsUnreadableGarbage(reason)) {
        chunks.push(
          reason.length > 80 ? `${reason.slice(0, 80)}…` : reason,
        );
      }
    }
    if (parsed.source && typeof parsed.source === "string") {
      const src = parsed.source as string;
      if (!containsUnreadableGarbage(src) && !chunks.some((c) => c.includes(src))) chunks.push(src);
    }

    if (chunks.length > 0) {
      const line = chunks.filter(Boolean).join(" · ");
      if (containsUnreadableGarbage(line)) return fb();
      return line.length > MAX_TABLE_SUMMARY ? `${line.slice(0, MAX_TABLE_SUMMARY)}…` : line;
    }

    const keys = Object.keys(parsed);
    if (keys.length === 0) return fb();
    return `${t("p8.admin.logs.detail_structured")} (${keys.length})`;
  }

  if (looksLikeJsonObjectString(loose)) {
    return fb();
  }

  const normalized = normalizeDetailText(detailsRaw);
  if (containsUnreadableGarbage(normalized)) {
    return fb();
  }

  const cleaned = normalized.replace(/\{|\}/g, " ").trim();
  const line =
    cleaned.length > MAX_TABLE_SUMMARY ? `${cleaned.slice(0, MAX_TABLE_SUMMARY)}…` : cleaned;
  if (containsUnreadableGarbage(line)) return fb();
  return line || fb();
}

function parsedObjectHasGarbageStrings(obj: Record<string, unknown>): boolean {
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && containsUnreadableGarbage(v)) return true;
  }
  return false;
}

function flattenDetailEntries(
  obj: Record<string, unknown>,
  actionKey: string,
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = detailFieldLabel(key);
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      try {
        out.push({
          label,
          value: JSON.stringify(val, null, 2),
        });
      } catch {
        out.push({ label, value: String(val) });
      }
    } else if (Array.isArray(val)) {
      try {
        out.push({ label, value: JSON.stringify(val, null, 2) });
      } catch {
        out.push({ label, value: String(val) });
      }
    } else {
      out.push({ label, value: formatPrimitiveForDisplay(key, val, actionKey) });
    }
  }
  return out;
}

function targetTypeDisplay(key: string): string {
  const i18nKey = `p8.admin.logs.filter.target.${key}`;
  const label = t(i18nKey);
  return label === i18nKey ? key : label;
}

function formatLogDate(iso: string | null): string {
  if (!iso) return t("p8.admin.common.dash");
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return t("p8.admin.common.dash");
  }
}

export default function AdminLogsPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const [actionType, setActionType] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [detailLog, setDetailLog] = useState<AdminActivityLog | null>(null);

  useEffect(() => {
    setPage(1);
  }, [actionType, targetType, search, dateFrom, dateTo]);

  const logsQuery = useQuery({
    queryKey: ["admin", "logs", actionType, targetType, search, dateFrom, dateTo, page, pageSize],
    queryFn: () =>
      getAdminLogs({
        actionType,
        targetType,
        q: search,
        from: dateFrom,
        to: dateTo,
        page,
        pageSize,
      }),
    enabled: !meQuery.isLoading && !meQuery.isError,
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const logs: AdminActivityLog[] = logsQuery.data?.items ?? [];
  const pagination = logsQuery.data?.pagination;

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4" dir="rtl">
        <AdminPageLoading message={t("p8.admin.common.loading")} className="w-full max-w-md border-none bg-transparent ring-0" />
      </div>
    );
  }

  return (
    <AdminShell activeKey="logs" onLogout={handleLogout}>
      <div
        className={cn("space-y-5", logsQuery.isFetching && logs.length > 0 && "opacity-[0.92] transition-opacity")}
        dir="rtl"
      >
        <header
          className={cn(
            "flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between",
            CARD_SHELL,
          )}
        >
          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <ScrollText className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("p8.admin.logs.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("p8.admin.logs.subtitle")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={BTN_TOOLBAR_OUTLINE}
            disabled={logsQuery.isFetching}
            title={logsQuery.isFetching ? t("p8.admin.noc.refreshing") : undefined}
            onClick={() => logsQuery.refetch()}
          >
            <RefreshCw className={cn("h-4 w-4 text-primary", logsQuery.isFetching && "animate-spin")} aria-hidden />
            {t("p8.admin.logs.refresh")}
          </Button>
        </header>

        <section className={cn(SUB_CARD, "border-amber-500/25 bg-amber-500/[0.06] p-4 ring-amber-500/10")}>
          <p className="text-sm font-medium text-amber-100/95">{t("p8.admin.logs.note")}</p>
        </section>

        <section className={cn(CARD_SHELL, "p-4 md:p-5")}>
          <div className="mb-6 flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t("p8.admin.logs.action_type_label")}</Label>
              <div className="flex max-h-[min(36vh,12rem)] flex-wrap gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-zinc-950/50 p-2 ring-1 ring-primary/10 sm:max-h-none">
                {ACTION_TYPE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActionType(key)}
                    className={adminPillBtn(actionType === key)}
                  >
                    {t(`p8.admin.logs.filter.action.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t("p8.admin.logs.target_type_label")}</Label>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-primary/25 bg-zinc-950/50 p-2 ring-1 ring-primary/10">
                {TARGET_TYPE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTargetType(key)}
                    className={adminPillBtn(targetType === key)}
                  >
                    {t(`p8.admin.logs.filter.target.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t("p8.admin.logs.from_date_label")}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={cn(INPUT_FIELD, "h-10 cursor-pointer")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t("p8.admin.logs.to_date_label")}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn(INPUT_FIELD, "h-10 cursor-pointer")}
                />
              </div>
              <form
                className="md:col-span-2 xl:col-span-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(searchInput.trim());
                }}
              >
                <Label className="mb-2 block text-sm text-muted-foreground">{t("p8.admin.logs.search_label")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t("p8.admin.logs.search_placeholder")}
                    autoComplete="off"
                    className={cn(INPUT_FIELD, "min-h-10 flex-1")}
                  />
                  <Button type="submit" className={cn(BTN_SEARCH, "min-h-10 shrink-0")}>
                    <Search className="h-4 w-4" aria-hidden />
                    {t("p8.admin.logs.search_button")}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {logsQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.logs.loading")} />
          ) : logsQuery.isError ? (
            <AdminErrorState
              description={t("p8.admin.logs.load_error")}
              onRetry={() => logsQuery.refetch()}
              retryLabel={t("p8.admin.logs.retry")}
            />
          ) : logs.length === 0 ? (
            <AdminEmptyState
              title={t("p8.admin.logs.empty_title")}
              description={t("p8.admin.logs.empty_body")}
            />
          ) : (
            <AdminScrollableTable
              items={logs}
              minWidth="min-w-[1080px]"
              tableClassName="border-collapse"
              head={
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_id")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_action_type")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_actor")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_target_type")}</th>
                    <th className="px-3 py-3 text-right font-medium tabular-nums">{t("p8.admin.logs.th_target_id")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_date")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.logs.th_details")}</th>
                    <th className="px-3 py-3 text-center font-medium">{t("p8.admin.logs.th_action")}</th>
                  </tr>
              }
              getRowKey={(log) => log.id}
              renderRow={(log) => (
                    <tr
                      key={log.id}
                      onClick={() => setDetailLog(log)}
                      className={cn("cursor-pointer last:border-0", ADMIN_TABLE_ROW)}
                    >
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{log.id}</td>
                      <td className="px-3 py-3 align-middle font-medium text-foreground">
                        {getActionLabel(log.actionType)}
                      </td>
                      <td className="px-3 py-3 align-middle text-foreground">
                        {formatActorCell(log)}
                      </td>
                      <td className="px-3 py-3 align-middle text-foreground">
                        {targetTypeDisplay(log.targetType)}
                      </td>
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                        {log.targetId ?? t("p8.admin.common.dash")}
                      </td>
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                        {formatLogDate(log.createdAt)}
                      </td>
                      <td className="max-w-[min(100%,320px)] px-3 py-3 align-middle">
                        <p
                          className="line-clamp-2 text-foreground"
                          title={buildTableSummary(log.actionType, log.details ?? "")}
                        >
                          {buildTableSummary(log.actionType, log.details ?? "")}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        <button
                          type="button"
                          className={cn(
                            ADMIN_ROW_ACTION_BASE,
                            "border-primary/35 bg-primary/10 text-primary hover:bg-primary/18",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailLog(log);
                          }}
                        >
                          {t("p8.admin.logs.open_details")}
                        </button>
                      </td>
                    </tr>
              )}
            />
          )}

          <AdminPaginationBar
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            isLoading={logsQuery.isFetching}
          />
        </section>
      </div>

      <Dialog open={detailLog !== null} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent
          dir="rtl"
          className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle className="text-lg font-semibold text-foreground">{t("p8.admin.logs.detail_title")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{t("p8.admin.logs.detail_hint")}</DialogDescription>
          </DialogHeader>
          {detailLog ? (
            <div className="grid gap-3 py-1 text-right text-sm">
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{t("p8.admin.logs.th_id")}: </span>
                <span className="font-semibold tabular-nums text-foreground">{detailLog.id}</span>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 ring-1 ring-primary/15">
                <p className="text-xs text-muted-foreground">{t("p8.admin.logs.th_action_type")}</p>
                <p className="text-base font-semibold leading-relaxed text-foreground">
                  {getActionLabel(detailLog.actionType)}
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{t("p8.admin.logs.th_actor")}: </span>
                <span className="text-foreground">{formatActorCell(detailLog)}</span>
                {detailLog.actorAdminId != null ? (
                  <span className="mr-2 text-xs tabular-nums text-muted-foreground">
                    {" "}
                    (#{detailLog.actorAdminId})
                  </span>
                ) : null}
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{t("p8.admin.logs.th_target_type")}: </span>
                <span className="text-foreground">{targetTypeDisplay(detailLog.targetType)}</span>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{t("p8.admin.logs.th_target_id")}: </span>
                <span className="tabular-nums text-foreground">{detailLog.targetId ?? t("p8.admin.common.dash")}</span>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{t("p8.admin.logs.th_date")}: </span>
                <span className="tabular-nums text-foreground">{formatLogDate(detailLog.createdAt)}</span>
              </div>

              {(() => {
                const raw = detailLog.details ?? "";
                const normalizedRaw = normalizeDetailText(raw);
                const normalizedRawLoose = normalizeDetailTextLoose(raw).trim();
                const parsed = parseDetailsJson(raw);
                const structuredEntries = parsed ? flattenDetailEntries(parsed, detailLog.actionType) : [];

                let plainNonJson =
                  !parsed && normalizedRaw && !looksLikeJsonObjectString(normalizedRawLoose)
                    ? normalizedRaw
                    : "";
                if (plainNonJson && containsUnreadableGarbage(plainNonJson)) {
                  plainNonJson = "";
                }

                const jsonUnreadable =
                  !parsed && normalizedRawLoose && looksLikeJsonObjectString(normalizedRawLoose);

                const rawLooksCorrupt = containsUnreadableGarbage(normalizeDetailTextLoose(raw));
                const parsedStringsCorrupt = parsed ? parsedObjectHasGarbageStrings(parsed) : false;
                const showLegacyEncodingBanner =
                  rawLooksCorrupt || parsedStringsCorrupt || jsonUnreadable;

                return (
                  <>
                    {showLegacyEncodingBanner ? (
                      <div className="rounded-xl border border-amber-500/35 bg-amber-950/35 px-3 py-3 text-sm leading-relaxed text-amber-100 ring-1 ring-amber-500/25">
                        {t("p8.admin.logs.legacy_encoding_alert")}
                      </div>
                    ) : null}

                    {structuredEntries.length > 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/40 px-3 py-3 ring-1 ring-primary/10">
                        <p className="mb-3 text-xs font-medium text-muted-foreground">{t("p8.admin.logs.detail_structured")}</p>
                        <dl className="grid gap-3">
                          {structuredEntries.map((row, idx) => (
                            <div
                              key={idx}
                              className="border-b border-primary/10 pb-3 last:border-0 last:pb-0"
                            >
                              <dt className="mb-1 text-xs text-muted-foreground">{row.label}</dt>
                              <dd className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                                {row.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}

                    {plainNonJson ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/40 px-3 py-3 ring-1 ring-primary/10">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.logs.detail_plain")}</p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                          {plainNonJson}
                        </p>
                      </div>
                    ) : null}

                    {jsonUnreadable ? (
                      <details className="rounded-xl border border-primary/20 bg-zinc-950/60 px-3 py-2 ring-1 ring-primary/10">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          {t("p8.admin.logs.technical_raw_optional")}
                        </summary>
                        <pre
                          className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-950/90 p-2 text-[11px] text-muted-foreground ring-1 ring-primary/10"
                          dir="ltr"
                        >
                          {sanitizeTechnicalBlob(normalizedRawLoose || raw)}
                        </pre>
                      </details>
                    ) : null}

                    {parsed && structuredEntries.length === 0 ? (
                      <p className="rounded-xl border border-primary/15 bg-zinc-900/30 px-3 py-2 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                        {t("p8.admin.logs.no_extra_fields")}
                      </p>
                    ) : null}

                    {!parsed && !plainNonJson && !jsonUnreadable && !normalizedRaw ? (
                      <p className="rounded-xl border border-primary/15 bg-zinc-900/30 px-3 py-2 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                        {t("p8.admin.logs.no_details")}
                      </p>
                    ) : null}

                    {typeof parsed?.deepLink === "string" && parsed.deepLink.startsWith("/") ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={BTN_MODAL_GHOST}
                        onClick={() => {
                          const href = String(parsed.deepLink);
                          setDetailLog(null);
                          navigate(href);
                        }}
                      >
                        {t("p8.admin.logs.open_target")}
                      </Button>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : null}
          <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <Button type="button" variant="outline" className={BTN_MODAL_GHOST} onClick={() => setDetailLog(null)}>
              {t("p8.admin.common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

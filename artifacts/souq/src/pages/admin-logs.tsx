import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, RefreshCw, ScrollText, Search } from "lucide-react";
import { adminLogout, getAdminLogs } from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  BTN_TOOLBAR_OUTLINE,
  CARD_SHELL,
  INPUT_FIELD,
  SURFACE_TABLE_WRAP,
  SUB_CARD,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
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
import { cn } from "@/lib/utils";

const T = {
  loading: "جاري تحميل السجلات...",
  title: "سجل النشاطات",
  subtitle: "متابعة أنشطة المشرفين وتغييرات النظام — بيانات مباشرة من الخادم.",
  note: "يتم عرض سجل الأنشطة الحقيقي المخزّن في قاعدة البيانات.",
  actionTypeLabel: "نوع العملية",
  targetTypeLabel: "نوع الهدف",
  fromDateLabel: "من تاريخ",
  toDateLabel: "إلى تاريخ",
  searchLabel: "بحث",
  searchPlaceholder: "ابحث في السجلات أو التفاصيل...",
  searchButton: "بحث",
  refresh: "تحديث",
  emptyTitle: "لا توجد سجلات أنشطة بعد",
  emptyBody: "ستظهر الأنشطة هنا بعد تفعيل نقطة سجلات الباكند.",
  loadError: "تعذر تحميل سجل الأنشطة.",
  retry: "إعادة المحاولة",
  thId: "المعرّف",
  thActionType: "نوع النشاط",
  thActor: "المنفّذ",
  thTargetType: "القسم / الهدف",
  thTargetId: "معرّف الهدف",
  thDate: "التاريخ والوقت",
  thDetails: "الوصف",
  thAction: "إجراء",
  openDetails: "تفاصيل",
  detailTitle: "تفاصيل النشاط",
  detailHint: "ملخص العملية وبيانات إضافية منقولة من الخادم بشكل منظم.",
  detailStructured: "البيانات الإضافية",
  detailPlain: "الوصف النصي",
  legacyEncodingAlert:
    "هذه بيانات قديمة غير مقروءة بسبب ترميز سابق، ولا يمكن استعادة النص الأصلي.",
  technicalRawOptional: "عرض خام تقني (اختياري)",
  close: "إغلاق",
};

const ACTION_TYPE_OPTIONS = [
  { key: "all", label: "كل العمليات" },
  { key: "ad", label: "إجراءات الإعلانات" },
  { key: "report", label: "إجراءات البلاغات" },
  { key: "support", label: "إجراءات الدعم" },
  { key: "user", label: "إجراءات المستخدمين" },
  { key: "category", label: "إجراءات الأقسام" },
  { key: "city", label: "إجراءات المدن" },
];

const TARGET_TYPE_OPTIONS = [
  { key: "all", label: "كل الأهداف" },
  { key: "ad", label: "إعلان" },
  { key: "report", label: "بلاغ" },
  { key: "support_ticket", label: "تذكرة دعم" },
  { key: "user", label: "مستخدم" },
  { key: "category", label: "قسم" },
  { key: "city", label: "مدينة" },
  { key: "system", label: "نظام" },
];

const ACTION_LABELS: Record<string, string> = {
  "ad.hide": "تم إخفاء الإعلان",
  "ad.unhide": "تم إظهار الإعلان",
  "ad.approve": "تم قبول الإعلان",
  "ad.reject": "تم رفض الإعلان",
  "ad.delete": "تم حذف الإعلان",
  "report.resolve": "تم حل البلاغ",
  "report.review": "تم وضع البلاغ قيد المراجعة",
  "report.ignore": "تم تجاهل البلاغ",
  "report.update_status": "تم تغيير حالة بلاغ",
  "support.close": "تم إغلاق تذكرة الدعم",
  "support.resolve": "تم حل تذكرة الدعم",
  "support.update": "تم تحديث تذكرة الدعم",
  "user.block": "تم حظر المستخدم",
  "user.unblock": "تم فك حظر المستخدم",
  "category.create": "تم إضافة قسم",
  "category.update": "تم تعديل قسم",
  "category.hide": "تم إخفاء قسم",
  "category.unhide": "تم إظهار قسم",
  "category.delete": "تم حذف قسم",
  "city.create": "تم إضافة مدينة",
  "city.update": "تم تعديل مدينة",
  "city.hide": "تم إخفاء مدينة",
  "city.unhide": "تم إظهار مدينة",
  "city.delete": "تم حذف مدينة",
  "settings.update": "تم تعديل إعدادات",
  "admin.password.change": "تم تغيير كلمة مرور المشرف",
};

/** تسميات عربية لمفاتيح JSON الشائعة في السجلات */
const DETAIL_FIELD_LABELS: Record<string, string> = {
  fromStatus: "من الحالة",
  toStatus: "إلى الحالة",
  fromHidden: "كان مخفياً",
  toHidden: "أصبح مخفياً",
  entityType: "نوع الكيان",
  name: "الاسم",
  slug: "المعرّف النصي",
  parentCategoryId: "القسم الأب",
  source: "المصدر",
  via: "عبر",
  reportId: "معرّف البلاغ",
  targetAdId: "معرّف الإعلان",
  adAction: "إجراء على الإعلان",
  fromPriority: "من الأولوية",
  toPriority: "إلى الأولوية",
  targetType: "نوع الهدف",
  targetId: "معرّف الهدف",
};

const AD_STATUS_AR: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  hidden: "مخفي",
};

const REPORT_STATUS_AR: Record<string, string> = {
  pending: "جديد",
  in_review: "قيد المراجعة",
  resolved: "محلول",
  rejected: "مرفوض",
  ignored: "متجاهل",
};

const SUPPORT_STATUS_AR: Record<string, string> = {
  open: "مفتوحة",
  pending: "معلّقة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};

const MAX_TABLE_SUMMARY = 160;

const FALLBACK_UNKNOWN_ACTION = "بيانات قديمة غير مقروءة";

/** يكتشف سلاسل الترميز التالفة: ???? ، Cursor ???? ، استبدال Unicode ، إلخ */
function containsUnreadableGarbage(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if (/\uFFFD/.test(t)) return true;
  if (/\?{3,}/.test(t)) return true;
  if (/cursor\s*[؟?]{2,}/i.test(t)) return true;
  if (/cursor\s*\?+/i.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  if (compact.length > 0 && /^[؟?]+$/.test(compact)) return true;
  const qMarks = (t.match(/\?/g) ?? []).length;
  const arabicQ = (t.match(/؟/g) ?? []).length;
  const loudQs = qMarks + arabicQ;
  if (compact.length > 3 && loudQs / compact.length > 0.2) return true;
  return false;
}

function getActionFallbackSummary(actionKey: string): string {
  return ACTION_LABELS[actionKey] ?? FALLBACK_UNKNOWN_ACTION;
}

/** للعرض التقني الاختياري فقط — لا يُستخدم في خلايا الجدول */
function sanitizeTechnicalBlob(s: string): string {
  return (s ?? "")
    .replace(/\uFFFD/g, "[…]")
    .replace(/\?{2,}/g, "[…]")
    .replace(/؟{2,}/g, "[…]");
}

function looksLikeJsonObjectString(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") || t.startsWith("[");
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
  let t = (s ?? "").trim();
  t = tryRecoverUtf8Mojibake(t);
  return t.replace(/\uFFFD/g, " ");
}

function normalizeDetailText(s: string): string {
  return normalizeDetailTextLoose(s).replace(/\s+/g, " ").trim();
}

function parseDetailsJson(raw: string): Record<string, unknown> | null {
  const t = normalizeDetailTextLoose(raw).trim();
  if (!t || !looksLikeJsonObjectString(t)) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatStatusForAction(actionKey: string, status: string): string {
  const k = actionKey.split(".")[0];
  if (k === "report" || actionKey.includes("report")) {
    return REPORT_STATUS_AR[status] ?? AD_STATUS_AR[status] ?? status;
  }
  if (k === "support") return SUPPORT_STATUS_AR[status] ?? status;
  return AD_STATUS_AR[status] ?? status;
}

function formatPrimitiveForDisplay(key: string, value: unknown, actionKey: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return value.toLocaleString("ar-EG");
  if (typeof value !== "string") {
    try {
      const js = JSON.stringify(value, null, 2);
      return containsUnreadableGarbage(js) ? "—" : js;
    } catch {
      return String(value);
    }
  }
  let s = normalizeDetailText(value);
  if (containsUnreadableGarbage(s)) return "—";
  if (/status/i.test(key) || key === "fromStatus" || key === "toStatus") {
    return formatStatusForAction(actionKey, s);
  }
  return s || "—";
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
    if (entity === "category") chunks.push("قسم");
    else if (entity === "subcategory") chunks.push("قسم فرعي");
    else if (entity === "city") chunks.push("مدينة");

    if (typeof parsed.name === "string" && parsed.name.trim()) {
      const nm = parsed.name.trim();
      if (!containsUnreadableGarbage(nm)) chunks.push(nm);
    }

    if (parsed.fromStatus != null && parsed.toStatus != null) {
      const a = String(parsed.fromStatus);
      const b = String(parsed.toStatus);
      chunks.push(`من ${formatStatusForAction(actionKey, a)} إلى ${formatStatusForAction(actionKey, b)}`);
    } else if (parsed.fromHidden != null && parsed.toHidden != null) {
      chunks.push(
        `${parsed.fromHidden ? "كان مخفياً" : "كان ظاهراً"} → ${parsed.toHidden ? "مخفي" : "ظاهر"}`,
      );
    }

    if (typeof parsed.reportId === "number") {
      chunks.push(`بلاغ #${parsed.reportId.toLocaleString("ar-EG")}`);
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
    return `بيانات إضافية (${keys.length} حقل)`;
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
    const label = DETAIL_FIELD_LABELS[key] ?? key.replace(/_/g, " ");
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

function getActionDisplayLabel(actionKey: string): string {
  return ACTION_LABELS[actionKey] ?? actionKey;
}

function targetTypeDisplay(key: string): string {
  return TARGET_TYPE_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

function formatLogDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
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
  const [detailLog, setDetailLog] = useState<AdminActivityLog | null>(null);

  const logsQuery = useQuery({
    queryKey: ["admin", "logs", actionType, targetType, search, dateFrom, dateTo],
    queryFn: () =>
      getAdminLogs({
        actionType,
        targetType,
        q: search,
        from: dateFrom,
        to: dateTo,
      }),
    enabled: !meQuery.isLoading && !meQuery.isError,
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const logs: AdminActivityLog[] = logsQuery.data ?? [];

  if (meQuery.isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground"
        dir="rtl"
      >
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
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
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{T.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{T.subtitle}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={BTN_TOOLBAR_OUTLINE}
            disabled={logsQuery.isFetching}
            title={logsQuery.isFetching ? "جاري التحديث..." : undefined}
            onClick={() => logsQuery.refetch()}
          >
            <RefreshCw className={cn("h-4 w-4 text-primary", logsQuery.isFetching && "animate-spin")} aria-hidden />
            {T.refresh}
          </Button>
        </header>

        <section className={cn(SUB_CARD, "border-amber-500/25 bg-amber-500/[0.06] p-4 ring-amber-500/10")}>
          <p className="text-sm font-medium text-amber-100/95">{T.note}</p>
        </section>

        <section className={cn(CARD_SHELL, "p-4 md:p-5")}>
          <div className="mb-6 flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{T.actionTypeLabel}</Label>
              <div className="flex max-h-[min(36vh,12rem)] flex-wrap gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-zinc-950/50 p-2 ring-1 ring-primary/10 sm:max-h-none">
                {ACTION_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActionType(option.key)}
                    className={adminPillBtn(actionType === option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{T.targetTypeLabel}</Label>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-primary/25 bg-zinc-950/50 p-2 ring-1 ring-primary/10">
                {TARGET_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTargetType(option.key)}
                    className={adminPillBtn(targetType === option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{T.fromDateLabel}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={cn(INPUT_FIELD, "h-10 cursor-pointer")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{T.toDateLabel}</Label>
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
                <Label className="mb-2 block text-sm text-muted-foreground">{T.searchLabel}</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={T.searchPlaceholder}
                    autoComplete="off"
                    className={cn(INPUT_FIELD, "min-h-10 flex-1")}
                  />
                  <Button type="submit" className={cn(BTN_SEARCH, "min-h-10 shrink-0")}>
                    <Search className="h-4 w-4" aria-hidden />
                    {T.searchButton}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {logsQuery.isLoading ? (
            <div className="rounded-2xl border border-primary/25 bg-zinc-950/60 px-6 py-12 text-center ring-1 ring-primary/10">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">{T.loading}</p>
            </div>
          ) : logsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-950/25 px-6 py-10 text-center text-red-100 ring-1 ring-red-500/20">
              <p className="text-base font-medium">{T.loadError}</p>
              <Button
                type="button"
                variant="outline"
                className={cn(BTN_MODAL_GHOST, "mt-4")}
                onClick={() => logsQuery.refetch()}
              >
                {T.retry}
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-primary/25 bg-zinc-950/60 px-6 py-10 text-center ring-1 ring-primary/10">
              <p className="text-base font-medium text-foreground">{T.emptyTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">{T.emptyBody}</p>
            </div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[1080px] border-collapse text-sm">
                <thead className="border-b border-primary/20 bg-zinc-900/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">{T.thId}</th>
                    <th className="px-3 py-3 text-right font-medium">{T.thActionType}</th>
                    <th className="px-3 py-3 text-right font-medium">{T.thActor}</th>
                    <th className="px-3 py-3 text-right font-medium">{T.thTargetType}</th>
                    <th className="px-3 py-3 text-right font-medium tabular-nums">{T.thTargetId}</th>
                    <th className="px-3 py-3 text-right font-medium">{T.thDate}</th>
                    <th className="px-3 py-3 text-right font-medium">{T.thDetails}</th>
                    <th className="px-3 py-3 text-center font-medium">{T.thAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setDetailLog(log)}
                      className={cn("cursor-pointer last:border-0", ADMIN_TABLE_ROW)}
                    >
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{log.id}</td>
                      <td className="px-3 py-3 align-middle font-medium text-foreground">
                        {getActionDisplayLabel(log.actionType)}
                      </td>
                      <td className="px-3 py-3 align-middle text-foreground">
                        {log.actor?.trim() ? log.actor : "—"}
                      </td>
                      <td className="px-3 py-3 align-middle text-foreground">
                        {targetTypeDisplay(log.targetType)}
                      </td>
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                        {log.targetId ?? "—"}
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
                          {T.openDetails}
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

      <Dialog open={detailLog !== null} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent
          dir="rtl"
          className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle className="text-lg font-semibold text-foreground">{T.detailTitle}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{T.detailHint}</DialogDescription>
          </DialogHeader>
          {detailLog ? (
            <div className="grid gap-3 py-1 text-right text-sm">
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{T.thId}: </span>
                <span className="font-semibold tabular-nums text-foreground">{detailLog.id}</span>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 ring-1 ring-primary/15">
                <p className="text-xs text-muted-foreground">{T.thActionType}</p>
                <p className="text-base font-semibold leading-relaxed text-foreground">
                  {getActionDisplayLabel(detailLog.actionType)}
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{T.thActor}: </span>
                <span className="text-foreground">{detailLog.actor?.trim() ? detailLog.actor : "—"}</span>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{T.thTargetType}: </span>
                <span className="text-foreground">{targetTypeDisplay(detailLog.targetType)}</span>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{T.thTargetId}: </span>
                <span className="tabular-nums text-foreground">{detailLog.targetId ?? "—"}</span>
              </div>
              <div className="rounded-xl border border-primary/20 bg-zinc-900/50 px-3 py-2 ring-1 ring-primary/8">
                <span className="text-muted-foreground">{T.thDate}: </span>
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
                        {T.legacyEncodingAlert}
                      </div>
                    ) : null}

                    {structuredEntries.length > 0 ? (
                      <div className="rounded-xl border border-primary/20 bg-zinc-900/40 px-3 py-3 ring-1 ring-primary/10">
                        <p className="mb-3 text-xs font-medium text-muted-foreground">{T.detailStructured}</p>
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
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{T.detailPlain}</p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                          {plainNonJson}
                        </p>
                      </div>
                    ) : null}

                    {jsonUnreadable ? (
                      <details className="rounded-xl border border-primary/20 bg-zinc-950/60 px-3 py-2 ring-1 ring-primary/10">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          {T.technicalRawOptional}
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
                        لا توجد حقول إضافية داخل كائن التفاصيل.
                      </p>
                    ) : null}

                    {!parsed && !plainNonJson && !jsonUnreadable && !normalizedRaw ? (
                      <p className="rounded-xl border border-primary/15 bg-zinc-900/30 px-3 py-2 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                        لا تفاصيل إضافية في هذا السجل.
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : null}
          <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <Button type="button" variant="outline" className={BTN_MODAL_GHOST} onClick={() => setDetailLog(null)}>
              {T.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  adminLogout,
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
} from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminCategories, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminCategory, AdminSubcategory } from "@/features/admin/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { CategoryIcon } from "@/components/category-icon";
import {
  BTN_MODAL_DANGER,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_SEARCH,
  BTN_TBL_DELETE,
  BTN_TBL_OUTLINE,
  BTN_TBL_TOGGLE,
  BTN_TOOLBAR_OUTLINE,
  BTN_TOOLBAR_PRIMARY,
  CARD_SHELL,
  DIALOG_SURFACE,
  INPUT_FIELD,
  PANEL_INSET,
  SELECT_FIELD,
  STAT_TILE,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TEXT = {
  loading: "جاري التحميل...",
  title: "إدارة الأقسام",
  subtitle: "إضافة وتعديل وتنظيم الأقسام والأقسام الفرعية الظاهرة للمستخدمين — بيانات مباشرة من الخادم.",
  search: "بحث",
  searchPlaceholder: "ابحث باسم القسم أو المعرف أو الوصف المختصر",
  status: "الحالة",
  all: "الكل",
  visible: "ظاهر",
  hidden: "مخفي",
  loadError: "تعذر تحميل الأقسام.",
  empty: "لا توجد أقسام مطابقة.",
  statsTotal: "إجمالي الأقسام",
  statsVisible: "ظاهرة",
  statsHidden: "مخفية",
  statsAds: "إعلانات في الأقسام",
  addCategory: "إضافة قسم رئيسي",
  addSubcategory: "إضافة قسم فرعي",
  edit: "تعديل",
  delete: "حذف",
  sortUp: "ترتيب لأعلى",
  sortDown: "ترتيب لأسفل",
  toggleHide: "إخفاء",
  toggleShow: "إظهار",
  ads: "الإعلانات",
  sort: "الترتيب",
  slug: "المعرّف",
  subtitleLabel: "الوصف المختصر",
  iconLabel: "الأيقونة",
  name: "الاسم",
  subcategories: "الأقسام الفرعية",
  noSubs: "لا توجد أقسام فرعية.",
  parentCategory: "القسم الرئيسي",
  pickParent: "اختر قسمًا رئيسيًا",
  save: "حفظ",
  cancel: "إلغاء",
  deleteConfirmTitle: "تأكيد الحذف",
  deleteConfirmHint:
    "لا يمكن التراجع عن هذا الإجراء. إذا كان القسم مرتبطًا بإعلانات، سيرفض الخادم الحذف.",
  deleteBlocked: "مُستخدم في إعلانات — يمكن الإخفاء بدل الحذف.",
  validationName: "اسم القسم مطلوب.",
  validationSlug: "المعرّف مطلوب.",
  validationParent: "اختر القسم الرئيسي.",
  datesUnavailable:
    "تواريخ الإضافة/التحديث غير متوفرة من الخادم لهذا الجدول حاليًا.",
  visibilityConfirmTitle: "تأكيد إظهار / إخفاء",
  visibilityConfirmHide: "هل تريد إخفاء هذا العنصر عن الواجهة العامة؟",
  visibilityConfirmShow: "هل تريد إظهار هذا العنصر في الواجهة العامة؟",
  confirmAction: "تأكيد",
  rowBusy: "جاري تنفيذ عملية على هذا الصف…",
  deleteInProgress: "جاري الحذف لهذا العنصر…",
};

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/** يطابق مفاتيح CategoryIcon (مثل smartphone، paw-print) */
function normalizeIconKey(icon: string) {
  const s = icon.trim();
  if (!s) return "tag";
  return s
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export default function AdminCategoriesPage() {
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const [qInput, setQInput] = useState(params.get("q") || "");
  const [q, setQ] = useState(params.get("q") || "");
  const [status, setStatus] = useState(params.get("status") || "all");

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<AdminCategory | null>(null);
  const [editSub, setEditSub] = useState<{
    sub: AdminSubcategory;
    parentLabel: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "subcategory";
    id: number;
    label: string;
    adsCount: number;
  } | null>(null);

  /** تأكيد إظهار/إخفاء قبل استدعاء PATCH */
  const [visibilityTarget, setVisibilityTarget] = useState<{
    scope: "category" | "subcategory";
    id: number;
    label: string;
    nextHidden: boolean;
  } | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    icon: "",
    subtitle: "",
  });
  const [newSubcategory, setNewSubcategory] = useState({
    categoryId: 0,
    name: "",
  });

  const [editCatFields, setEditCatFields] = useState({
    name: "",
    slug: "",
    icon: "",
    subtitle: "",
  });
  const [editSubName, setEditSubName] = useState("");

  const [newCatErrors, setNewCatErrors] = useState<Record<string, string>>({});
  const [newSubErrors, setNewSubErrors] = useState<Record<string, string>>({});
  const [editCatErrors, setEditCatErrors] = useState<Record<string, string>>({});
  const [editSubErrors, setEditSubErrors] = useState<Record<string, string>>({});

  const categoriesQuery = useAdminCategories({ status, q });
  const categories = categoriesQuery.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: async () => {
      await refresh();
      toast({ title: "تمت إضافة القسم بنجاح" });
      setAddCategoryOpen(false);
      setAddSubOpen(false);
      setNewCategory({ name: "", slug: "", icon: "", subtitle: "" });
      setNewSubcategory({ categoryId: 0, name: "" });
      setNewCatErrors({});
      setNewSubErrors({});
    },
    onError: (error) => {
      toast({
        title: "تعذر إضافة القسم",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAdminCategory>[1] }) =>
      updateAdminCategory(id, payload),
    onSuccess: async (_, vars) => {
      await refresh();
      const p = vars.payload;
      const isCategoryFormSave =
        p.type === "category" &&
        p.name !== undefined &&
        p.slug !== undefined &&
        p.icon !== undefined &&
        p.subtitle !== undefined;
      const isSubNameSave = p.type === "subcategory" && p.name !== undefined && p.sortOrder === undefined && p.isHidden === undefined;
      if (isCategoryFormSave) {
        toast({ title: "تم تحديث القسم" });
        setEditCategory(null);
        setEditCatErrors({});
      } else if (isSubNameSave) {
        toast({ title: "تم تحديث القسم الفرعي" });
        setEditSub(null);
        setEditSubErrors({});
      } else {
        toast({ title: "تم التحديث" });
      }
    },
    onError: (error) => {
      toast({
        title: "تعذر التحديث",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: "category" | "subcategory" }) =>
      deleteAdminCategory(id, type),
    onSuccess: async () => {
      await refresh();
      toast({ title: "تم حذف العنصر" });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: "تعذر الحذف",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  /** للإضافة الفرعية: كل الأقسام الرئيسية (حتى المخفية) كي لا يُعرقل الربط */
  const categoryOptions = useMemo(() => categories, [categories]);

  const stats = useMemo(() => {
    const visible = categories.filter((c) => !c.isHidden).length;
    const hidden = categories.filter((c) => c.isHidden).length;
    const adsSum = categories.reduce((acc, c) => acc + c.adsCount, 0);
    return { total: categories.length, visible, hidden, adsSum };
  }, [categories]);

  useEffect(() => {
    if (!editCategory) return;
    setEditCatFields({
      name: decodeEscapedUnicode(editCategory.name),
      slug: decodeEscapedUnicode(editCategory.slug),
      icon: decodeEscapedUnicode(editCategory.icon),
      subtitle: decodeEscapedUnicode(editCategory.subtitle),
    });
    setEditCatErrors({});
  }, [editCategory]);

  useEffect(() => {
    if (!editSub) return;
    setEditSubName(decodeEscapedUnicode(editSub.sub.name));
    setEditSubErrors({});
  }, [editSub]);

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const validateNewCategory = () => {
    const errors: Record<string, string> = {};
    if (!newCategory.name.trim()) errors.name = TEXT.validationName;
    setNewCatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditCategory = () => {
    const errors: Record<string, string> = {};
    if (!editCatFields.name.trim()) errors.name = TEXT.validationName;
    if (!editCatFields.slug.trim()) errors.slug = TEXT.validationSlug;
    setEditCatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNewSub = () => {
    const errors: Record<string, string> = {};
    if (!newSubcategory.categoryId) errors.categoryId = TEXT.validationParent;
    if (!newSubcategory.name.trim()) errors.name = TEXT.validationName;
    setNewSubErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditSub = () => {
    const errors: Record<string, string> = {};
    if (!editSubName.trim()) errors.name = TEXT.validationName;
    setEditSubErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        {TEXT.loading}
      </div>
    );
  }

  return (
    <AdminShell activeKey="categories" onLogout={handleLogout}>
      <div className="space-y-5" dir="rtl">
        <header className={cn("px-5 py-5", CARD_SHELL)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{TEXT.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">{TEXT.subtitle}</p>
              <p className="mt-2 text-xs text-zinc-500">{TEXT.datesUnavailable}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className={cn(BTN_TOOLBAR_PRIMARY, "shadow-[0_0_18px_-8px_hsl(var(--primary)/0.55)]")}
                onClick={() => {
                  setNewCategory({ name: "", slug: "", icon: "", subtitle: "" });
                  setNewCatErrors({});
                  setAddCategoryOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                {TEXT.addCategory}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={BTN_TOOLBAR_OUTLINE}
                onClick={() => {
                  setNewSubcategory({ categoryId: categoryOptions[0]?.id ?? 0, name: "" });
                  setNewSubErrors({});
                  setAddSubOpen(true);
                }}
              >
                <FolderPlus className="size-4" aria-hidden />
                {TEXT.addSubcategory}
              </Button>
            </div>
          </div>
        </header>

        <section className={cn("grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4", CARD_SHELL)}>
          <div className={STAT_TILE}>
            <p className="text-xs text-zinc-500">{TEXT.statsTotal}</p>
            <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
          </div>
          <div
            className={cn(
              STAT_TILE,
              "border-emerald-500/35 hover:border-emerald-400/45 hover:shadow-[0_0_22px_-12px_rgba(52,211,153,0.18)]",
            )}
          >
            <p className="text-xs text-zinc-500">{TEXT.statsVisible}</p>
            <p className="text-2xl font-semibold text-emerald-400">{stats.visible}</p>
          </div>
          <div
            className={cn(
              STAT_TILE,
              "border-amber-500/35 hover:border-amber-400/45 hover:shadow-[0_0_22px_-12px_rgba(251,191,36,0.15)]",
            )}
          >
            <p className="text-xs text-zinc-500">{TEXT.statsHidden}</p>
            <p className="text-2xl font-semibold text-amber-400">{stats.hidden}</p>
          </div>
          <div className={STAT_TILE}>
            <p className="text-xs text-zinc-500">{TEXT.statsAds}</p>
            <p className="text-2xl font-semibold text-primary">{stats.adsSum}</p>
          </div>
        </section>

        <section className={cn("p-4 sm:p-5", CARD_SHELL)}>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            <form
              className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setQ(qInput.trim());
              }}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="cat-q" className="text-zinc-400">
                  {TEXT.search}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cat-q"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    placeholder={TEXT.searchPlaceholder}
                    autoComplete="off"
                    className={cn(INPUT_FIELD, "flex-1")}
                  />
                  <Button type="submit" className={BTN_SEARCH}>
                    <Search className="size-4" aria-hidden />
                    {TEXT.search}
                  </Button>
                </div>
              </div>
            </form>
            <div className="w-full shrink-0 space-y-2 lg:w-auto lg:min-w-[min(100%,17rem)]" dir="rtl">
              <Label className="block text-zinc-400">{TEXT.status}</Label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={TEXT.status}
              >
                {(
                  [
                    { value: "all" as const, label: TEXT.all },
                    { value: "active" as const, label: TEXT.visible },
                    { value: "hidden" as const, label: TEXT.hidden },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={adminPillBtn(status === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {categoriesQuery.isLoading ? (
            <div className={cn(PANEL_INSET, "text-zinc-400")}>جاري تحميل الأقسام...</div>
          ) : categoriesQuery.isError ? (
            <div
              className={cn(
                PANEL_INSET,
                "border-red-500/35 bg-red-950/20 text-red-200 ring-1 ring-red-500/15",
              )}
            >
              {TEXT.loadError}
            </div>
          ) : categories.length === 0 ? (
            <div className={cn(PANEL_INSET, "text-zinc-400")}>{TEXT.empty}</div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-primary/20 bg-zinc-900/85 text-right text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-3 font-medium">{TEXT.name}</th>
                    <th className="px-3 py-3 font-medium">{TEXT.slug}</th>
                    <th className="px-3 py-3 font-medium">{TEXT.subtitleLabel}</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">{TEXT.ads}</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">{TEXT.sort}</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">الحالة</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">أيقونة</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const catRowBusy =
                      updateMutation.isPending && updateMutation.variables?.id === category.id;
                    return (
                    <Fragment key={category.id}>
                      <tr
                        className={cn(
                          "border-b border-primary/10 bg-zinc-950/45 transition-colors duration-200",
                          "hover:bg-primary/[0.06] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]",
                        )}
                      >
                        <td className="px-3 py-3 align-middle font-medium text-foreground">
                          {decodeEscapedUnicode(category.name)}
                        </td>
                        <td className="px-3 py-3 align-middle text-zinc-400" dir="ltr">
                          {decodeEscapedUnicode(category.slug)}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 align-middle text-zinc-400">
                          {decodeEscapedUnicode(category.subtitle)}
                        </td>
                        <td className="px-3 py-3 align-middle tabular-nums text-zinc-300">{category.adsCount}</td>
                        <td className="px-3 py-3 align-middle tabular-nums text-zinc-300">{category.sortOrder}</td>
                        <td className="px-3 py-3 align-middle">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              category.isHidden
                                ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
                            )}
                          >
                            {category.isHidden ? TEXT.hidden : TEXT.visible}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.5)]">
                            <CategoryIcon
                              name={normalizeIconKey(category.icon)}
                              className="size-5 shrink-0"
                            />
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={BTN_TBL_OUTLINE}
                              onClick={() => setEditCategory(category)}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              {TEXT.edit}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={BTN_TBL_OUTLINE}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: category.id,
                                  payload: { type: "category", sortOrder: category.sortOrder - 1 },
                                })
                              }
                              disabled={catRowBusy}
                              title={catRowBusy ? TEXT.rowBusy : TEXT.sortUp}
                            >
                              <ArrowUp className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={BTN_TBL_OUTLINE}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: category.id,
                                  payload: { type: "category", sortOrder: category.sortOrder + 1 },
                                })
                              }
                              disabled={catRowBusy}
                              title={catRowBusy ? TEXT.rowBusy : TEXT.sortDown}
                            >
                              <ArrowDown className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={BTN_TBL_TOGGLE}
                              onClick={() =>
                                setVisibilityTarget({
                                  scope: "category",
                                  id: category.id,
                                  label: decodeEscapedUnicode(category.name),
                                  nextHidden: !category.isHidden,
                                })
                              }
                              disabled={catRowBusy}
                              title={catRowBusy ? TEXT.rowBusy : undefined}
                            >
                              {category.isHidden ? TEXT.toggleShow : TEXT.toggleHide}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={BTN_TBL_DELETE}
                              disabled={
                                category.adsCount > 0 ||
                                (deleteMutation.isPending &&
                                  deleteMutation.variables?.id === category.id &&
                                  deleteMutation.variables?.type === "category")
                              }
                              title={
                                category.adsCount > 0
                                  ? TEXT.deleteBlocked
                                  : deleteMutation.isPending &&
                                      deleteMutation.variables?.id === category.id &&
                                      deleteMutation.variables?.type === "category"
                                    ? TEXT.deleteInProgress
                                    : TEXT.delete
                              }
                              onClick={() =>
                                setDeleteTarget({
                                  type: "category",
                                  id: category.id,
                                  label: decodeEscapedUnicode(category.name),
                                  adsCount: category.adsCount,
                                })
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              {TEXT.delete}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr
                        className={cn(
                          "border-b border-primary/10 bg-zinc-950/55 transition-colors duration-200",
                          "hover:bg-zinc-900/40",
                        )}
                      >
                        <td colSpan={8} className="px-3 py-4">
                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                            <Layers className="size-4 text-primary/80" aria-hidden />
                            {TEXT.subcategories}
                          </div>
                          {category.subcategories.length === 0 ? (
                            <p className="mt-2 text-sm text-zinc-500">{TEXT.noSubs}</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {category.subcategories.map((sub) => {
                                const subRowBusy =
                                  updateMutation.isPending && updateMutation.variables?.id === sub.id;
                                return (
                                <div
                                  key={sub.id}
                                  className={cn(
                                    SUB_CARD,
                                    "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground">
                                      {decodeEscapedUnicode(sub.name)}
                                      <span
                                        className={cn(
                                          "mr-2 text-xs",
                                          sub.isHidden ? "text-amber-400" : "text-emerald-400",
                                        )}
                                      >
                                        ({sub.isHidden ? TEXT.hidden : TEXT.visible})
                                      </span>
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      {TEXT.ads}: {sub.adsCount} · {TEXT.sort}: {sub.sortOrder}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className={BTN_TBL_OUTLINE}
                                      onClick={() =>
                                        setEditSub({
                                          sub,
                                          parentLabel: decodeEscapedUnicode(category.name),
                                        })
                                      }
                                    >
                                      <Pencil className="size-3.5" aria-hidden />
                                      {TEXT.edit}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className={BTN_TBL_OUTLINE}
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: sub.id,
                                          payload: { type: "subcategory", sortOrder: sub.sortOrder - 1 },
                                        })
                                      }
                                      disabled={subRowBusy}
                                      title={subRowBusy ? TEXT.rowBusy : TEXT.sortUp}
                                    >
                                      <ArrowUp className="size-3.5" aria-hidden />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className={BTN_TBL_OUTLINE}
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: sub.id,
                                          payload: { type: "subcategory", sortOrder: sub.sortOrder + 1 },
                                        })
                                      }
                                      disabled={subRowBusy}
                                      title={subRowBusy ? TEXT.rowBusy : TEXT.sortDown}
                                    >
                                      <ArrowDown className="size-3.5" aria-hidden />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className={BTN_TBL_TOGGLE}
                                      onClick={() =>
                                        setVisibilityTarget({
                                          scope: "subcategory",
                                          id: sub.id,
                                          label: decodeEscapedUnicode(sub.name),
                                          nextHidden: !sub.isHidden,
                                        })
                                      }
                                      disabled={subRowBusy}
                                      title={subRowBusy ? TEXT.rowBusy : undefined}
                                    >
                                      {sub.isHidden ? TEXT.toggleShow : TEXT.toggleHide}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className={BTN_TBL_DELETE}
                                      disabled={
                                        sub.adsCount > 0 ||
                                        (deleteMutation.isPending &&
                                          deleteMutation.variables?.id === sub.id &&
                                          deleteMutation.variables?.type === "subcategory")
                                      }
                                      title={
                                        sub.adsCount > 0
                                          ? TEXT.deleteBlocked
                                          : deleteMutation.isPending &&
                                              deleteMutation.variables?.id === sub.id &&
                                              deleteMutation.variables?.type === "subcategory"
                                            ? TEXT.deleteInProgress
                                            : TEXT.delete
                                      }
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: "subcategory",
                                          id: sub.id,
                                          label: decodeEscapedUnicode(sub.name),
                                          adsCount: sub.adsCount,
                                        })
                                      }
                                    >
                                      <Trash2 className="size-3.5" aria-hidden />
                                      {TEXT.delete}
                                    </Button>
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* إضافة قسم رئيسي */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-lg")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{TEXT.addCategory}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              الحقول المطلوبة محددة. يمكن ترك المعرّف فارغًا ليُشتق من الاسم.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-name">{TEXT.name} *</Label>
              <Input
                id="new-cat-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
              {newCatErrors.name ? (
                <p className="text-xs text-red-400">{newCatErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-slug">{TEXT.slug}</Label>
              <Input
                id="new-cat-slug"
                value={newCategory.slug}
                onChange={(e) => setNewCategory((p) => ({ ...p, slug: e.target.value }))}
                className={cn(INPUT_FIELD, "font-mono text-left")}
                dir="ltr"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-icon">{TEXT.iconLabel}</Label>
              <Input
                id="new-cat-icon"
                value={newCategory.icon}
                onChange={(e) => setNewCategory((p) => ({ ...p, icon: e.target.value }))}
                placeholder="مثل: smartphone أو Car"
                className={INPUT_FIELD}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                اسم أيقونة Lucide أو الرمز الافتراضي Tag. تُعرض الأيقونة بعد الحفظ في القائمة.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-sub">{TEXT.subtitleLabel}</Label>
              <Input
                id="new-cat-sub"
                value={newCategory.subtitle}
                onChange={(e) => setNewCategory((p) => ({ ...p, subtitle: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              onClick={() => setAddCategoryOpen(false)}
            >
              {TEXT.cancel}
            </Button>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={createMutation.isPending}
              onClick={() => {
                if (!validateNewCategory()) return;
                createMutation.mutate({
                  type: "category",
                  name: newCategory.name.trim(),
                  slug: newCategory.slug.trim() || undefined,
                  icon: newCategory.icon.trim() || "Tag",
                  subtitle: newCategory.subtitle.trim() || newCategory.name.trim(),
                });
              }}
            >
              {TEXT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة قسم فرعي */}
      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{TEXT.addSubcategory}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              يُربط القسم الفرعي بأحد الأقسام الرئيسية المسجّلة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-sub-parent">{TEXT.parentCategory} *</Label>
              <select
                id="new-sub-parent"
                value={newSubcategory.categoryId || ""}
                onChange={(e) =>
                  setNewSubcategory((p) => ({ ...p, categoryId: Number(e.target.value) }))
                }
                className={cn(SELECT_FIELD, INPUT_FIELD)}
              >
                <option value="">{TEXT.pickParent}</option>
                {categoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {decodeEscapedUnicode(item.name)}
                  </option>
                ))}
              </select>
              {newSubErrors.categoryId ? (
                <p className="text-xs text-red-400">{newSubErrors.categoryId}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-sub-name">{TEXT.name} *</Label>
              <Input
                id="new-sub-name"
                value={newSubcategory.name}
                onChange={(e) => setNewSubcategory((p) => ({ ...p, name: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
              {newSubErrors.name ? (
                <p className="text-xs text-red-400">{newSubErrors.name}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              onClick={() => setAddSubOpen(false)}
            >
              {TEXT.cancel}
            </Button>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={createMutation.isPending}
              onClick={() => {
                if (!validateNewSub()) return;
                createMutation.mutate({
                  type: "subcategory",
                  categoryId: newSubcategory.categoryId,
                  name: newSubcategory.name.trim(),
                });
              }}
            >
              {TEXT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل قسم رئيسي */}
      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-lg")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>تعديل القسم الرئيسي</DialogTitle>
            <DialogDescription className="text-zinc-400">
              تحديث الاسم والمعرّف والأيقونة والوصف المختصر. يتم الحفظ عبر واجهة الإدارة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-name">{TEXT.name} *</Label>
              <Input
                id="edit-cat-name"
                value={editCatFields.name}
                onChange={(e) => setEditCatFields((p) => ({ ...p, name: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
              {editCatErrors.name ? <p className="text-xs text-red-400">{editCatErrors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-slug">{TEXT.slug} *</Label>
              <Input
                id="edit-cat-slug"
                value={editCatFields.slug}
                onChange={(e) => setEditCatFields((p) => ({ ...p, slug: e.target.value }))}
                className={cn(INPUT_FIELD, "font-mono text-left")}
                dir="ltr"
                autoComplete="off"
              />
              {editCatErrors.slug ? <p className="text-xs text-red-400">{editCatErrors.slug}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-icon">{TEXT.iconLabel}</Label>
              <Input
                id="edit-cat-icon"
                value={editCatFields.icon}
                onChange={(e) => setEditCatFields((p) => ({ ...p, icon: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-sub">{TEXT.subtitleLabel}</Label>
              <Input
                id="edit-cat-sub"
                value={editCatFields.subtitle}
                onChange={(e) => setEditCatFields((p) => ({ ...p, subtitle: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              onClick={() => setEditCategory(null)}
            >
              {TEXT.cancel}
            </Button>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={
                !!(
                  updateMutation.isPending &&
                  editCategory &&
                  updateMutation.variables?.id === editCategory.id
                )
              }
              onClick={() => {
                if (!editCategory || !validateEditCategory()) return;
                updateMutation.mutate({
                  id: editCategory.id,
                  payload: {
                    type: "category",
                    name: editCatFields.name.trim(),
                    slug: editCatFields.slug.trim(),
                    icon: editCatFields.icon.trim(),
                    subtitle: editCatFields.subtitle.trim(),
                  },
                });
              }}
            >
              {TEXT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل قسم فرعي */}
      <Dialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>تعديل قسم فرعي</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editSub ? (
                <>
                  ضمن القسم: <span className="text-primary">{editSub.parentLabel}</span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sub-name">{TEXT.name} *</Label>
              <Input
                id="edit-sub-name"
                value={editSubName}
                onChange={(e) => setEditSubName(e.target.value)}
                className={INPUT_FIELD}
                autoComplete="off"
              />
              {editSubErrors.name ? <p className="text-xs text-red-400">{editSubErrors.name}</p> : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_GHOST}
              onClick={() => setEditSub(null)}
            >
              {TEXT.cancel}
            </Button>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={
                !!(
                  updateMutation.isPending &&
                  editSub &&
                  updateMutation.variables?.id === editSub.sub.id
                )
              }
              onClick={() => {
                if (!editSub || !validateEditSub()) return;
                updateMutation.mutate({
                  id: editSub.sub.id,
                  payload: { type: "subcategory", name: editSubName.trim() },
                });
              }}
            >
              {TEXT.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد إظهار / إخفاء — بدون تنفيذ مباشر من الجدول */}
      <AlertDialog
        open={!!visibilityTarget}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setVisibilityTarget(null);
        }}
      >
        <AlertDialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle>{TEXT.visibilityConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {visibilityTarget ? (
                <>
                  <span className="font-medium text-foreground">{visibilityTarget.label}</span>
                  <span className="mt-2 block">
                    {visibilityTarget.nextHidden ? TEXT.visibilityConfirmHide : TEXT.visibilityConfirmShow}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <AlertDialogCancel className={cn(BTN_MODAL_GHOST, "mt-0")}>{TEXT.cancel}</AlertDialogCancel>
            <Button
              type="button"
              className={BTN_MODAL_PRIMARY}
              disabled={updateMutation.isPending || !visibilityTarget}
              onClick={() => {
                if (!visibilityTarget) return;
                const { scope, id, nextHidden } = visibilityTarget;
                updateMutation.mutate(
                  {
                    id,
                    payload: {
                      type: scope === "category" ? "category" : "subcategory",
                      isHidden: nextHidden,
                    },
                  },
                  { onSuccess: () => setVisibilityTarget(null) },
                );
              }}
            >
              {TEXT.confirmAction}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تأكيد الحذف — زر تأكيد يدوي بدون AlertDialogAction لتجنب مسح الحالة قبل mutate */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md border-red-500/20")}>
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle>{TEXT.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteTarget ? (
                <>
                  {deleteTarget.type === "category" ? "القسم الرئيسي: " : "القسم الفرعي: "}
                  <span className="font-medium text-foreground">{deleteTarget.label}</span>
                  <br />
                  <span className="mt-2 block text-xs text-zinc-500">{TEXT.deleteConfirmHint}</span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <AlertDialogCancel className={cn(BTN_MODAL_GHOST, "mt-0")}>{TEXT.cancel}</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className={BTN_MODAL_DANGER}
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate({ id: deleteTarget.id, type: deleteTarget.type });
              }}
            >
              {TEXT.delete}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderPlus,
  Plus,
  Search,
} from "lucide-react";
import {
  adminLogout,
  createAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
} from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  AdminCategoryTreePanel,
  decodeEscapedUnicode,
  type AdminCategoryTreeText,
} from "@/features/admin/components/admin-category-tree-panel";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
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
import {
  BTN_MODAL_DANGER,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_SEARCH,
  BTN_TOOLBAR_OUTLINE,
  BTN_TOOLBAR_PRIMARY,
  CARD_SHELL,
  DIALOG_SURFACE,
  INPUT_FIELD,
  SELECT_FIELD,
  STAT_TILE,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

function categoryTreeText(): AdminCategoryTreeText {
  return {
    name: t("p8.admin.categories.name"),
    slug: t("p8.admin.categories.slug"),
    subtitleLabel: t("p8.admin.categories.subtitle_label"),
    ads: t("p8.admin.categories.ads"),
    sort: t("p8.admin.categories.sort"),
    hidden: t("p8.admin.categories.hidden"),
    visible: t("p8.admin.categories.visible"),
    edit: t("p8.admin.categories.edit"),
    delete: t("p8.admin.categories.delete"),
    sortUp: t("p8.admin.categories.sort_up"),
    sortDown: t("p8.admin.categories.sort_down"),
    toggleHide: t("p8.admin.categories.toggle_hide"),
    toggleShow: t("p8.admin.categories.toggle_show"),
    subcategories: t("p8.admin.categories.subcategories"),
    noSubs: t("p8.admin.categories.no_subs"),
    rowBusy: t("p8.admin.categories.row_busy"),
    deleteBlocked: t("p8.admin.categories.delete_blocked"),
    deleteInProgress: t("p8.admin.categories.delete_in_progress"),
  };
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
  const treeText = categoryTreeText();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
  };

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: async () => {
      await refresh();
      toast({ title: t("p8.admin.categories.toast_created") });
      setAddCategoryOpen(false);
      setAddSubOpen(false);
      setNewCategory({ name: "", slug: "", icon: "", subtitle: "" });
      setNewSubcategory({ categoryId: 0, name: "" });
      setNewCatErrors({});
      setNewSubErrors({});
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.categories.toast_create_fail"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
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
        toast({ title: t("p8.admin.categories.toast_updated_category") });
        setEditCategory(null);
        setEditCatErrors({});
      } else if (isSubNameSave) {
        toast({ title: t("p8.admin.categories.toast_updated_sub") });
        setEditSub(null);
        setEditSubErrors({});
      } else {
        toast({ title: t("p8.admin.categories.toast_updated") });
      }
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.categories.toast_update_fail"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: "category" | "subcategory" }) =>
      deleteAdminCategory(id, type),
    onSuccess: async () => {
      await refresh();
      toast({ title: t("p8.admin.categories.toast_deleted") });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.categories.toast_delete_fail"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
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
    if (!newCategory.name.trim()) errors.name = t("p8.admin.categories.validation_name");
    setNewCatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditCategory = () => {
    const errors: Record<string, string> = {};
    if (!editCatFields.name.trim()) errors.name = t("p8.admin.categories.validation_name");
    if (!editCatFields.slug.trim()) errors.slug = t("p8.admin.categories.validation_slug");
    setEditCatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNewSub = () => {
    const errors: Record<string, string> = {};
    if (!newSubcategory.categoryId) errors.categoryId = t("p8.admin.categories.validation_parent");
    if (!newSubcategory.name.trim()) errors.name = t("p8.admin.categories.validation_name");
    setNewSubErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditSub = () => {
    const errors: Record<string, string> = {};
    if (!editSubName.trim()) errors.name = t("p8.admin.categories.validation_name");
    setEditSubErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] flex items-center justify-center" dir="rtl">
        <AdminPageLoading message={t("p8.admin.categories.loading")} />
      </div>
    );
  }

  return (
    <AdminShell activeKey="categories" onLogout={handleLogout}>
      <div className="space-y-5" dir="rtl">
        <header className={cn("px-5 py-5", CARD_SHELL)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("p8.admin.categories.title")}</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t("p8.admin.categories.subtitle")}</p>
              <p className="mt-2 text-xs text-zinc-500">{t("p8.admin.categories.dates_unavailable")}</p>
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
                {t("p8.admin.categories.add_category")}
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
                {t("p8.admin.categories.add_subcategory")}
              </Button>
            </div>
          </div>
        </header>

        <section className={cn("grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4", CARD_SHELL)}>
          <div className={STAT_TILE}>
            <p className="text-xs text-zinc-500">{t("p8.admin.categories.stats_total")}</p>
            <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
          </div>
          <div
            className={cn(
              STAT_TILE,
              "border-emerald-500/35 hover:border-emerald-400/45 hover:shadow-[0_0_22px_-12px_rgba(52,211,153,0.18)]",
            )}
          >
            <p className="text-xs text-zinc-500">{t("p8.admin.categories.stats_visible")}</p>
            <p className="text-2xl font-semibold text-emerald-400">{stats.visible}</p>
          </div>
          <div
            className={cn(
              STAT_TILE,
              "border-amber-500/35 hover:border-amber-400/45 hover:shadow-[0_0_22px_-12px_rgba(251,191,36,0.15)]",
            )}
          >
            <p className="text-xs text-zinc-500">{t("p8.admin.categories.stats_hidden")}</p>
            <p className="text-2xl font-semibold text-amber-400">{stats.hidden}</p>
          </div>
          <div className={STAT_TILE}>
            <p className="text-xs text-zinc-500">{t("p8.admin.categories.stats_ads")}</p>
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
                  {t("p8.admin.categories.search")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cat-q"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    placeholder={t("p8.admin.categories.search_placeholder")}
                    autoComplete="off"
                    className={cn(INPUT_FIELD, "flex-1")}
                  />
                  <Button type="submit" className={BTN_SEARCH}>
                    <Search className="size-4" aria-hidden />
                    {t("p8.admin.categories.search")}
                  </Button>
                </div>
              </div>
            </form>
            <div className="w-full shrink-0 space-y-2 lg:w-auto lg:min-w-[min(100%,17rem)]" dir="rtl">
              <Label className="block text-zinc-400">{t("p8.admin.categories.status")}</Label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t("p8.admin.categories.status")}
              >
                {(
                  [
                    { value: "all" as const, label: t("p8.admin.categories.all") },
                    { value: "active" as const, label: t("p8.admin.categories.visible") },
                    { value: "hidden" as const, label: t("p8.admin.categories.hidden") },
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
            <AdminPageLoading message={t("p8.admin.categories.loading_list")} />
          ) : categoriesQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.categories.load_error")}
              description={t("p8.admin.categories.load_error_hint")}
              onRetry={() => void categoriesQuery.refetch()}
            />
          ) : categories.length === 0 ? (
            <AdminEmptyState title={t("p8.admin.categories.empty")} />
          ) : (
            <AdminCategoryTreePanel
              categories={categories}
              text={treeText}
              updatePending={updateMutation.isPending}
              updateVariables={updateMutation.variables}
              deletePending={deleteMutation.isPending}
              deleteVariables={deleteMutation.variables}
              onEditCategory={setEditCategory}
              onEditSub={(sub, parentLabel) => setEditSub({ sub, parentLabel })}
              onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
              onVisibilityTarget={setVisibilityTarget}
              onDeleteTarget={setDeleteTarget}
            />
          )}
        </section>
      </div>

      {/* إضافة قسم رئيسي */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-lg")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{t("p8.admin.categories.add_category")}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("p8.admin.categories.add_category_hint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-name">{t("p8.admin.categories.name")} *</Label>
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
              <Label htmlFor="new-cat-slug">{t("p8.admin.categories.slug")}</Label>
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
              <Label htmlFor="new-cat-icon">{t("p8.admin.categories.icon_label")}</Label>
              <Input
                id="new-cat-icon"
                value={newCategory.icon}
                onChange={(e) => setNewCategory((p) => ({ ...p, icon: e.target.value }))}
                placeholder={t("p8.admin.categories.icon_placeholder")}
                className={INPUT_FIELD}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {t("p8.admin.categories.icon_hint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-cat-sub">{t("p8.admin.categories.subtitle_label")}</Label>
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
              {t("p8.admin.categories.cancel")}
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
              {t("p8.admin.categories.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة قسم فرعي */}
      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{t("p8.admin.categories.add_subcategory")}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("p8.admin.categories.add_sub_hint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-sub-parent">{t("p8.admin.categories.parent_category")} *</Label>
              <select
                id="new-sub-parent"
                value={newSubcategory.categoryId || ""}
                onChange={(e) =>
                  setNewSubcategory((p) => ({ ...p, categoryId: Number(e.target.value) }))
                }
                className={cn(SELECT_FIELD, INPUT_FIELD)}
              >
                <option value="">{t("p8.admin.categories.pick_parent")}</option>
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
              <Label htmlFor="new-sub-name">{t("p8.admin.categories.name")} *</Label>
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
              {t("p8.admin.categories.cancel")}
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
              {t("p8.admin.categories.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل قسم رئيسي */}
      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-lg")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{t("p8.admin.categories.edit_category_title")}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("p8.admin.categories.edit_category_hint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-name">{t("p8.admin.categories.name")} *</Label>
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
              <Label htmlFor="edit-cat-slug">{t("p8.admin.categories.slug")} *</Label>
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
              <Label htmlFor="edit-cat-icon">{t("p8.admin.categories.icon_label")}</Label>
              <Input
                id="edit-cat-icon"
                value={editCatFields.icon}
                onChange={(e) => setEditCatFields((p) => ({ ...p, icon: e.target.value }))}
                className={INPUT_FIELD}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-sub">{t("p8.admin.categories.subtitle_label")}</Label>
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
              {t("p8.admin.categories.cancel")}
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
              {t("p8.admin.categories.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل قسم فرعي */}
      <Dialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)}>
        <DialogContent dir="rtl" className={cn(DIALOG_SURFACE, "max-w-md")}>
          <DialogHeader className="space-y-2 text-right sm:text-right">
            <DialogTitle>{t("p8.admin.categories.edit_sub_title")}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editSub ? (
                <>
                  {t("p8.admin.categories.edit_sub_within")}{" "}
                  <span className="text-primary">{editSub.parentLabel}</span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sub-name">{t("p8.admin.categories.name")} *</Label>
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
              {t("p8.admin.categories.cancel")}
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
              {t("p8.admin.categories.save")}
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
            <AlertDialogTitle>{t("p8.admin.categories.visibility_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {visibilityTarget ? (
                <>
                  <span className="font-medium text-foreground">{visibilityTarget.label}</span>
                  <span className="mt-2 block">
                    {visibilityTarget.nextHidden
                      ? t("p8.admin.categories.visibility_confirm_hide")
                      : t("p8.admin.categories.visibility_confirm_show")}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <AlertDialogCancel className={cn(BTN_MODAL_GHOST, "mt-0")}>{t("p8.admin.categories.cancel")}</AlertDialogCancel>
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
              {t("p8.admin.categories.confirm_action")}
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
            <AlertDialogTitle>{t("p8.admin.categories.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteTarget ? (
                <>
                  {deleteTarget.type === "category"
                    ? t("p8.admin.categories.delete_category_prefix")
                    : t("p8.admin.categories.delete_sub_prefix")}{" "}
                  <span className="font-medium text-foreground">{deleteTarget.label}</span>
                  <br />
                  <span className="mt-2 block text-xs text-zinc-500">{t("p8.admin.categories.delete_confirm_hint")}</span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start sm:space-x-reverse">
            <AlertDialogCancel className={cn(BTN_MODAL_GHOST, "mt-0")}>{t("p8.admin.categories.cancel")}</AlertDialogCancel>
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
              {t("p8.admin.categories.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

import { Fragment, memo } from "react";
import {
  ArrowDown,
  ArrowUp,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import type { updateAdminCategory } from "@/features/admin/api";
import type { AdminCategory, AdminSubcategory } from "@/features/admin/types";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import {
  BTN_TBL_DELETE,
  BTN_TBL_OUTLINE,
  BTN_TBL_TOGGLE,
  SUB_CARD,
  SURFACE_TABLE_WRAP,
} from "@/features/admin/admin-interaction-classes";
import { cn } from "@/lib/utils";

export function decodeEscapedUnicode(value: string) {
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

export type AdminCategoryTreeText = {
  name: string;
  slug: string;
  subtitleLabel: string;
  ads: string;
  sort: string;
  hidden: string;
  visible: string;
  edit: string;
  delete: string;
  sortUp: string;
  sortDown: string;
  toggleHide: string;
  toggleShow: string;
  subcategories: string;
  noSubs: string;
  rowBusy: string;
  deleteBlocked: string;
  deleteInProgress: string;
};

type UpdatePayload = Parameters<typeof updateAdminCategory>[1];

export type AdminCategoryTreePanelProps = {
  categories: AdminCategory[];
  text: AdminCategoryTreeText;
  updatePending: boolean;
  updateVariables?: { id: number; payload: UpdatePayload };
  deletePending: boolean;
  deleteVariables?: { id: number; type: "category" | "subcategory" };
  onEditCategory: (category: AdminCategory) => void;
  onEditSub: (sub: AdminSubcategory, parentLabel: string) => void;
  onUpdate: (id: number, payload: UpdatePayload) => void;
  onVisibilityTarget: (target: {
    scope: "category" | "subcategory";
    id: number;
    label: string;
    nextHidden: boolean;
  }) => void;
  onDeleteTarget: (target: {
    type: "category" | "subcategory";
    id: number;
    label: string;
    adsCount: number;
  }) => void;
};

function AdminCategorySubRow({
  sub,
  parentLabel,
  text,
  subRowBusy,
  deletePending,
  deleteVariables,
  onEditSub,
  onUpdate,
  onVisibilityTarget,
  onDeleteTarget,
}: {
  sub: AdminSubcategory;
  parentLabel: string;
  text: AdminCategoryTreeText;
  subRowBusy: boolean;
  deletePending: boolean;
  deleteVariables?: { id: number; type: "category" | "subcategory" };
  onEditSub: (sub: AdminSubcategory, parentLabel: string) => void;
  onUpdate: (id: number, payload: UpdatePayload) => void;
  onVisibilityTarget: AdminCategoryTreePanelProps["onVisibilityTarget"];
  onDeleteTarget: AdminCategoryTreePanelProps["onDeleteTarget"];
}) {
  return (
    <div
      key={sub.id}
      className={cn(SUB_CARD, "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between")}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {decodeEscapedUnicode(sub.name)}
          <span
            className={cn("mr-2 text-xs", sub.isHidden ? "text-amber-400" : "text-emerald-400")}
          >
            ({sub.isHidden ? text.hidden : text.visible})
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {text.ads}: {sub.adsCount} · {text.sort}: {sub.sortOrder}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_TBL_OUTLINE}
          onClick={() => onEditSub(sub, parentLabel)}
        >
          <Pencil className="size-3.5" aria-hidden />
          {text.edit}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_TBL_OUTLINE}
          onClick={() =>
            onUpdate(sub.id, { type: "subcategory", sortOrder: sub.sortOrder - 1 })
          }
          disabled={subRowBusy}
          title={subRowBusy ? text.rowBusy : text.sortUp}
        >
          <ArrowUp className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_TBL_OUTLINE}
          onClick={() =>
            onUpdate(sub.id, { type: "subcategory", sortOrder: sub.sortOrder + 1 })
          }
          disabled={subRowBusy}
          title={subRowBusy ? text.rowBusy : text.sortDown}
        >
          <ArrowDown className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_TBL_TOGGLE}
          onClick={() =>
            onVisibilityTarget({
              scope: "subcategory",
              id: sub.id,
              label: decodeEscapedUnicode(sub.name),
              nextHidden: !sub.isHidden,
            })
          }
          disabled={subRowBusy}
          title={subRowBusy ? text.rowBusy : undefined}
        >
          {sub.isHidden ? text.toggleShow : text.toggleHide}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={BTN_TBL_DELETE}
          disabled={
            sub.adsCount > 0 ||
            (deletePending &&
              deleteVariables?.id === sub.id &&
              deleteVariables?.type === "subcategory")
          }
          title={
            sub.adsCount > 0
              ? text.deleteBlocked
              : deletePending &&
                  deleteVariables?.id === sub.id &&
                  deleteVariables?.type === "subcategory"
                ? text.deleteInProgress
                : text.delete
          }
          onClick={() =>
            onDeleteTarget({
              type: "subcategory",
              id: sub.id,
              label: decodeEscapedUnicode(sub.name),
              adsCount: sub.adsCount,
            })
          }
        >
          <Trash2 className="size-3.5" aria-hidden />
          {text.delete}
        </Button>
      </div>
    </div>
  );
}

const AdminCategorySubRowMemo = memo(AdminCategorySubRow);

function AdminCategoryTreePanelInner({
  categories,
  text,
  updatePending,
  updateVariables,
  deletePending,
  deleteVariables,
  onEditCategory,
  onEditSub,
  onUpdate,
  onVisibilityTarget,
  onDeleteTarget,
}: AdminCategoryTreePanelProps) {
  return (
    <div className={SURFACE_TABLE_WRAP}>
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-primary/20 bg-zinc-900/85 text-right text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-3 font-medium">{text.name}</th>
            <th className="px-3 py-3 font-medium">{text.slug}</th>
            <th className="px-3 py-3 font-medium">{text.subtitleLabel}</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">{text.ads}</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">{text.sort}</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">الحالة</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">أيقونة</th>
            <th className="px-3 py-3 font-medium whitespace-nowrap">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const catRowBusy = updatePending && updateVariables?.id === category.id;
            const parentLabel = decodeEscapedUnicode(category.name);
            return (
              <Fragment key={category.id}>
                <tr
                  className={cn(
                    "border-b border-primary/10 bg-zinc-950/45 transition-colors duration-200",
                    "hover:bg-primary/[0.06] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]",
                  )}
                >
                  <td className="px-3 py-3 align-middle font-medium text-foreground">
                    {parentLabel}
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
                      {category.isHidden ? text.hidden : text.visible}
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
                        onClick={() => onEditCategory(category)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        {text.edit}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={BTN_TBL_OUTLINE}
                        onClick={() =>
                          onUpdate(category.id, { type: "category", sortOrder: category.sortOrder - 1 })
                        }
                        disabled={catRowBusy}
                        title={catRowBusy ? text.rowBusy : text.sortUp}
                      >
                        <ArrowUp className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={BTN_TBL_OUTLINE}
                        onClick={() =>
                          onUpdate(category.id, { type: "category", sortOrder: category.sortOrder + 1 })
                        }
                        disabled={catRowBusy}
                        title={catRowBusy ? text.rowBusy : text.sortDown}
                      >
                        <ArrowDown className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={BTN_TBL_TOGGLE}
                        onClick={() =>
                          onVisibilityTarget({
                            scope: "category",
                            id: category.id,
                            label: parentLabel,
                            nextHidden: !category.isHidden,
                          })
                        }
                        disabled={catRowBusy}
                        title={catRowBusy ? text.rowBusy : undefined}
                      >
                        {category.isHidden ? text.toggleShow : text.toggleHide}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={BTN_TBL_DELETE}
                        disabled={
                          category.adsCount > 0 ||
                          (deletePending &&
                            deleteVariables?.id === category.id &&
                            deleteVariables?.type === "category")
                        }
                        title={
                          category.adsCount > 0
                            ? text.deleteBlocked
                            : deletePending &&
                                deleteVariables?.id === category.id &&
                                deleteVariables?.type === "category"
                              ? text.deleteInProgress
                              : text.delete
                        }
                        onClick={() =>
                          onDeleteTarget({
                            type: "category",
                            id: category.id,
                            label: parentLabel,
                            adsCount: category.adsCount,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {text.delete}
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
                      {text.subcategories}
                    </div>
                    {category.subcategories.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">{text.noSubs}</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {category.subcategories.map((sub) => {
                          const subRowBusy = updatePending && updateVariables?.id === sub.id;
                          return (
                            <AdminCategorySubRowMemo
                              key={sub.id}
                              sub={sub}
                              parentLabel={parentLabel}
                              text={text}
                              subRowBusy={subRowBusy}
                              deletePending={deletePending}
                              deleteVariables={deleteVariables}
                              onEditSub={onEditSub}
                              onUpdate={onUpdate}
                              onVisibilityTarget={onVisibilityTarget}
                              onDeleteTarget={onDeleteTarget}
                            />
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
  );
}

export const AdminCategoryTreePanel = memo(AdminCategoryTreePanelInner);

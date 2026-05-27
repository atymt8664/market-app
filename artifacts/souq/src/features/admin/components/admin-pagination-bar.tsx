import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BTN_FIX, CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import type { AdminPaginationMeta } from "@/features/admin/admin-pagination";
import { ADMIN_PAGE_SIZE_OPTIONS } from "@/features/admin/admin-pagination";
import { AdminSelectField } from "@/features/admin/components/admin-select-field";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

type AdminPaginationBarProps = {
  pagination: AdminPaginationMeta | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  className?: string;
};

export const AdminPaginationBar = memo(function AdminPaginationBar({
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  className,
}: AdminPaginationBarProps) {
  if (!pagination) return null;

  const { page, pageSize, totalPages, totalItems, hasNext, hasPrevious } = pagination;
  const numberLocale = getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";

  return (
    <section
      className={cn(CARD_SHELL, "flex flex-wrap items-center justify-between gap-3 p-3 text-sm", className)}
      aria-label={t("p8.admin.pagination.aria_label")}
    >
      <p className="text-muted-foreground">
        {totalItems > 0 ? (
          t("p8.admin.pagination.summary", {
            page,
            totalPages,
            totalItems: totalItems.toLocaleString(numberLocale),
          })
        ) : (
          t("p8.admin.pagination.no_items")
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{t("p8.admin.pagination.page_size")}</span>
          <AdminSelectField
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
            options={ADMIN_PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            triggerClassName="min-w-[4.5rem]"
            disabled={isLoading}
          />
        </label>

        <button
          type="button"
          disabled={!hasPrevious || isLoading}
          onClick={() => onPageChange(page - 1)}
          className={cn(BTN_FIX, "inline-flex items-center gap-1 rounded-2xl px-3 py-2 disabled:opacity-40")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
          {t("p8.admin.pagination.previous")}
        </button>
        <button
          type="button"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          className={cn(BTN_FIX, "inline-flex items-center gap-1 rounded-2xl px-3 py-2 disabled:opacity-40")}
        >
          {t("p8.admin.pagination.next")}
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
});

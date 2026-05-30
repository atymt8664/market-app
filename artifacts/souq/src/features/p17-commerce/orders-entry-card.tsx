import type { KeyboardEvent } from "react";
import { ChevronLeft, Package } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { SETTINGS_ICON_TILE } from "@/components/settings-shell";
import { CommerceComingSoonBadge } from "./coming-soon-badge";

type OrdersEntryCardProps = {
  titleKey: "p17.commerce.page.entry_buyer_title" | "p17.commerce.page.entry_seller_title";
  onNavigate?: () => void;
  className?: string;
  testId: string;
};

export function OrdersEntryCard({
  titleKey,
  onNavigate,
  className,
  testId,
}: OrdersEntryCardProps) {
  const interactive = typeof onNavigate === "function";

  return (
    <button
      type="button"
      dir="rtl"
      data-testid={testId}
      className={cn(
        "flex w-full min-h-[70px] items-center gap-3 px-4 py-3.5 text-right transition-colors",
        interactive && "hover:bg-primary/[0.04] active:bg-primary/[0.07]",
        className,
      )}
      onClick={onNavigate}
      onKeyDown={(e: KeyboardEvent) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate?.();
        }
      }}
    >
      <div className={SETTINGS_ICON_TILE}>
        <Package className="h-4 w-4 text-primary" strokeWidth={2.1} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground md:text-[15px]">{t(titleKey)}</span>
          <CommerceComingSoonBadge />
        </div>
        <span className="text-[11px] leading-snug text-muted-foreground/90 md:text-xs">
          {t("p17.commerce.page.entry_subtitle")}
        </span>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-primary/50" aria-hidden />
    </button>
  );
}

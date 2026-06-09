import type { KeyboardEvent, ReactNode } from "react";
import { ChevronLeft, Package, Store } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_LABEL,
  profileSectionClassName,
} from "@/components/profile-section-shell";
import { CommerceComingSoonBadge } from "./coming-soon-badge";
import { isP17OrdersHubVisible } from "./p17-commerce-flags";

type OrdersAccountCardGridProps = {
  onBuyerNavigate?: () => void;
  onSellerNavigate?: () => void;
  className?: string;
};

function CommerceDockTile({
  testId,
  icon,
  titleKey,
  onNavigate,
  showComingSoonBadge,
  className,
}: {
  testId: string;
  icon: ReactNode;
  titleKey: string;
  onNavigate?: () => void;
  showComingSoonBadge?: boolean;
  className?: string;
}) {
  const badgeClass = "shrink-0 px-1 py-px text-[7px] md:text-[8px]";

  return (
    <button
      type="button"
      dir="rtl"
      data-testid={testId}
      aria-label={t(titleKey)}
      className={cn(
        "group flex min-h-8 w-full min-w-0 items-center justify-between gap-1.5 px-2.5 py-1 text-right transition-colors hover:bg-black/40 active:scale-[0.995] md:px-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
        className,
      )}
      onClick={onNavigate}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate?.();
        }
      }}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-[#0A0A0A]/90 text-primary shadow-[0_0_10px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 [&_svg]:h-3 [&_svg]:w-3">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-xs font-semibold text-foreground md:text-[13px]">
            {t(titleKey)}
          </span>
          {showComingSoonBadge ? <CommerceComingSoonBadge className={badgeClass} /> : null}
        </span>
      </span>
      <ChevronLeft
        className="h-3.5 w-3.5 shrink-0 text-primary/50 transition-[transform,color] group-hover:-translate-x-0.5 group-hover:text-primary"
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  );
}

/** P17-4A — profile entry: unified commerce dock (buyer + seller hubs). */
export function OrdersAccountCardGrid({
  onBuyerNavigate,
  onSellerNavigate,
  className,
}: OrdersAccountCardGridProps) {
  const hubVisible = isP17OrdersHubVisible();
  return (
    <section
      dir="rtl"
      className={profileSectionClassName(cn("overflow-hidden", className))}
      data-testid="p17-orders-account-grid"
    >
      <div className={cn(PROFILE_SECTION_HEADER, "text-right")}>
        <p className={PROFILE_SECTION_LABEL}>{t("profile.section.commerce")}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-primary/20 rtl:divide-x-reverse">
        <CommerceDockTile
          testId="p17-preview-buyer-orders"
          icon={<Package strokeWidth={2.25} />}
          titleKey="p17.commerce.page.entry_buyer_title"
          onNavigate={onBuyerNavigate}
          showComingSoonBadge={!hubVisible}
        />
        <CommerceDockTile
          testId="p17-preview-seller-orders"
          icon={<Store strokeWidth={2.25} />}
          titleKey="p17.commerce.page.entry_seller_title"
          onNavigate={onSellerNavigate}
          showComingSoonBadge={!hubVisible}
        />
      </div>
    </section>
  );
}

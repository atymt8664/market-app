import type { KeyboardEvent, ReactNode } from "react";
import { Package, Store } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  PROFILE_STATS_GRID,
  profileStatTileInteractive,
  profileStatTileShell,
} from "@/components/profile-stat-tiles";
import { CommerceComingSoonBadge } from "./coming-soon-badge";
import { isP17OrdersHubVisible } from "./p17-commerce-flags";

type OrdersAccountCardGridProps = {
  onBuyerNavigate?: () => void;
  onSellerNavigate?: () => void;
  className?: string;
};

function OrdersAccountTile({
  testId,
  icon,
  titleKey,
  onNavigate,
  showComingSoonBadge,
}: {
  testId: string;
  icon: ReactNode;
  titleKey: string;
  onNavigate?: () => void;
  showComingSoonBadge?: boolean;
}) {
  const badgeClass = "px-1.5 py-px text-[8px] md:text-[9px]";

  return (
    <button
      type="button"
      dir="rtl"
      data-testid={testId}
      aria-label={t(titleKey)}
      className={cn(profileStatTileShell, profileStatTileInteractive)}
      onClick={onNavigate}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate?.();
        }
      }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-primary [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <span className="max-w-[100%] truncate px-0.5 text-[9px] font-semibold leading-tight text-foreground md:text-[10px]">
        {t(titleKey)}
      </span>
      {showComingSoonBadge ? <CommerceComingSoonBadge className={badgeClass} /> : null}
    </button>
  );
}

/** P17-4A — profile entry: buyer + seller hubs only (no preview detail tiles). */
export function OrdersAccountCardGrid({
  onBuyerNavigate,
  onSellerNavigate,
  className,
}: OrdersAccountCardGridProps) {
  const hubVisible = isP17OrdersHubVisible();
  return (
    <div dir="rtl" className={cn(PROFILE_STATS_GRID, className)} data-testid="p17-orders-account-grid">
      <OrdersAccountTile
        testId="p17-preview-buyer-orders"
        icon={<Package strokeWidth={2.25} />}
        titleKey="p17.commerce.page.entry_buyer_title"
        onNavigate={onBuyerNavigate}
        showComingSoonBadge={!hubVisible}
      />
      <OrdersAccountTile
        testId="p17-preview-seller-orders"
        icon={<Store strokeWidth={2.25} />}
        titleKey="p17.commerce.page.entry_seller_title"
        onNavigate={onSellerNavigate}
        showComingSoonBadge={!hubVisible}
      />
    </div>
  );
}

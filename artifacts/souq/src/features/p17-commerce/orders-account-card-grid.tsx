import type { KeyboardEvent, ReactNode } from "react";
import { ClipboardList, FileText, Package, Store } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  PROFILE_STATS_GRID,
  profileStatTileInteractive,
  profileStatTileShell,
} from "@/components/profile-stat-tiles";
import { CommerceComingSoonBadge, CommercePreviewBadge } from "./coming-soon-badge";

type OrdersAccountCardGridProps = {
  onBuyerNavigate?: () => void;
  onSellerNavigate?: () => void;
  onBuyerDetailNavigate?: () => void;
  onSellerDetailNavigate?: () => void;
  className?: string;
};

type TileBadgeVariant = "soon" | "preview";

function OrdersAccountTile({
  testId,
  icon,
  titleKey,
  badge,
  onNavigate,
}: {
  testId: string;
  icon: ReactNode;
  titleKey: string;
  badge: TileBadgeVariant;
  onNavigate?: () => void;
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
      {badge === "soon" ? (
        <CommerceComingSoonBadge className={badgeClass} />
      ) : (
        <CommercePreviewBadge className={badgeClass} />
      )}
    </button>
  );
}

export function OrdersAccountCardGrid({
  onBuyerNavigate,
  onSellerNavigate,
  onBuyerDetailNavigate,
  onSellerDetailNavigate,
  className,
}: OrdersAccountCardGridProps) {
  return (
    <div dir="rtl" className={cn(PROFILE_STATS_GRID, className)} data-testid="p17-orders-account-grid">
      <OrdersAccountTile
        testId="p17-preview-buyer-orders"
        icon={<Package strokeWidth={2.25} />}
        titleKey="p17.commerce.page.entry_buyer_title"
        badge="soon"
        onNavigate={onBuyerNavigate}
      />
      <OrdersAccountTile
        testId="p17-preview-seller-orders"
        icon={<Store strokeWidth={2.25} />}
        titleKey="p17.commerce.page.entry_seller_title"
        badge="soon"
        onNavigate={onSellerNavigate}
      />
      <OrdersAccountTile
        testId="p17-preview-buyer-order-detail"
        icon={<FileText strokeWidth={2.25} />}
        titleKey="p17.commerce.detail.buyer_title"
        badge="preview"
        onNavigate={onBuyerDetailNavigate}
      />
      <OrdersAccountTile
        testId="p17-preview-seller-order-detail"
        icon={<ClipboardList strokeWidth={2.25} />}
        titleKey="p17.commerce.detail.seller_title"
        badge="preview"
        onNavigate={onSellerDetailNavigate}
      />
    </div>
  );
}

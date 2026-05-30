import { OrdersEntryCard } from "./orders-entry-card";

type BuyerOrdersPreviewCardProps = {
  onNavigate?: () => void;
  className?: string;
};

export function BuyerOrdersPreviewCard({ onNavigate, className }: BuyerOrdersPreviewCardProps) {
  return (
    <OrdersEntryCard
      testId="p17-preview-buyer-orders"
      titleKey="p17.commerce.page.entry_buyer_title"
      onNavigate={onNavigate}
      className={className}
    />
  );
}

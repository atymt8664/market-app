import { OrdersEntryCard } from "./orders-entry-card";

type SellerOrdersPreviewCardProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SellerOrdersPreviewCard({ onNavigate, className }: SellerOrdersPreviewCardProps) {
  return (
    <OrdersEntryCard
      testId="p17-preview-seller-orders"
      titleKey="p17.commerce.page.entry_seller_title"
      onNavigate={onNavigate}
      className={className}
    />
  );
}

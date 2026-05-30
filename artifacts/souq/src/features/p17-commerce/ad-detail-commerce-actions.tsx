import { useState } from "react";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CommerceComingSoonSheet } from "./coming-soon-sheet";
import { P17_ADD_TO_CART_BTN, P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";

type AdDetailCommerceActionsProps = {
  /** Base height/radius for secondary commerce row (add to cart) */
  secondaryButtonClassName?: string;
  /** Hide when the viewer owns the listing */
  hidden?: boolean;
};

/**
 * P17 ad-detail commerce placeholders — cart + buy now (no checkout/API/DB).
 * Both open the same coming-soon sheet.
 */
export function AdDetailCommerceActions({
  secondaryButtonClassName = "h-12",
  hidden,
}: AdDetailCommerceActionsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (hidden) return null;

  const openSheet = () => setSheetOpen(true);

  return (
    <>
      <button
        type="button"
        dir="rtl"
        data-testid="p17-ad-detail-add-to-cart"
        aria-label={t("p17.commerce.ad_detail.add_to_cart_aria")}
        className={cn(P17_ADD_TO_CART_BTN, secondaryButtonClassName)}
        onClick={openSheet}
      >
        {t("p17.commerce.ad_detail.add_to_cart")}
        <ShoppingCart className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
      </button>

      <button
        type="button"
        dir="rtl"
        data-testid="p17-ad-detail-buy-now"
        aria-label={t("p17.commerce.ad_detail.buy_now_aria")}
        className={cn(P17_BUY_NOW_BTN, "h-[3.25rem]")}
        onClick={openSheet}
      >
        {t("p17.commerce.ad_detail.buy_now")}
        <ShoppingBag className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.35} aria-hidden />
      </button>

      <CommerceComingSoonSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

/** @deprecated Use AdDetailCommerceActions */
export { AdDetailCommerceActions as AdDetailBuyNowButton };

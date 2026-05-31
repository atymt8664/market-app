import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CommerceComingSoonSheet } from "./coming-soon-sheet";
import { P17_ADD_TO_CART_BTN, P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";
import { isP17BuyNowEnabled } from "./p17-commerce-flags";
import {
  checkoutPathForAd,
  loginRedirectForCheckout,
} from "./p17-commerce-redirect";

type AdDetailCommerceActionsProps = {
  adId: number;
  /** Base height/radius for secondary commerce row (add to cart) */
  secondaryButtonClassName?: string;
  /** Hide when the viewer owns the listing */
  hidden?: boolean;
};

export function AdDetailCommerceActions({
  adId,
  secondaryButtonClassName = "h-12",
  hidden,
}: AdDetailCommerceActionsProps) {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const buyNowEnabled = isP17BuyNowEnabled();

  if (hidden) return null;

  const openSheet = () => setSheetOpen(true);

  const handleBuyNow = () => {
    if (!buyNowEnabled) {
      openSheet();
      return;
    }
    if (!isAuthenticated || !user) {
      navigate(loginRedirectForCheckout(adId));
      return;
    }
    navigate(checkoutPathForAd(adId));
  };

  return (
    <>
      <button
        type="button"
        dir="rtl"
        data-testid="p17-ad-detail-buy-now"
        aria-label={t("p17.commerce.ad_detail.buy_now_aria")}
        className={cn(P17_BUY_NOW_BTN, "h-[3.25rem]")}
        onClick={handleBuyNow}
      >
        {t("p17.commerce.ad_detail.buy_now")}
        <ShoppingBag className="h-[1.25rem] w-[1.25rem] shrink-0 text-primary-foreground" strokeWidth={2.5} aria-hidden />
      </button>

      {!buyNowEnabled ? (
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
      ) : null}

      {!buyNowEnabled ? (
        <CommerceComingSoonSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      ) : null}
    </>
  );
}

/** @deprecated Use AdDetailCommerceActions */
export { AdDetailCommerceActions as AdDetailBuyNowButton };

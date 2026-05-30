import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CommerceComingSoonSheet } from "./coming-soon-sheet";

type AdDetailBuyNowButtonProps = {
  /** Shared height/radius with seller action buttons */
  buttonClassName?: string;
  /** Hide when the viewer owns the listing */
  hidden?: boolean;
};

/**
 * P17 ad-detail Buy Now — UI foundation only (P17-5 checkout not enabled).
 * Opens coming-soon sheet; no API, payment, or order creation.
 */
export function AdDetailBuyNowButton({ buttonClassName, hidden }: AdDetailBuyNowButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        dir="rtl"
        data-testid="p17-ad-detail-buy-now"
        aria-label={t("p17.commerce.ad_detail.buy_now_aria")}
        className={cn(
          buttonClassName,
          "flex w-full items-center justify-center gap-2 border-2 border-primary/70 bg-[#0A0A0A] font-semibold text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15 transition-[transform,box-shadow,border-color,background-color] hover:border-primary/85 hover:bg-zinc-950/95 hover:shadow-[0_0_20px_-6px_hsl(var(--primary)/0.34)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
        onClick={() => setSheetOpen(true)}
      >
        {t("p17.commerce.ad_detail.buy_now")}
        <ShoppingBag className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
      </button>
      <CommerceComingSoonSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

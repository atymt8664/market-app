import { Check, Rocket } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const FEATURE_KEYS = [
  "p17.commerce.coming_soon.feature_create_orders",
  "p17.commerce.coming_soon.feature_order_statuses",
  "p17.commerce.coming_soon.feature_timeline",
  "p17.commerce.coming_soon.feature_shipping_track",
  "p17.commerce.coming_soon.feature_protection",
  "p17.commerce.coming_soon.feature_seller_management",
] as const;

/** Dark Premium card shell — aligned with ad-detail seller cards */
const P17_SHEET_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12";

type CommerceComingSoonSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommerceComingSoonSheet({ open, onOpenChange }: CommerceComingSoonSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        data-testid="p17-coming-soon-sheet"
        overlayClassName="bg-black/88 backdrop-blur-[3px]"
        className={cn(
          "flex max-h-[min(88dvh,560px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t-2 border-primary/45 !bg-[#0A0A0A]/98 p-0 shadow-[0_-16px_56px_-18px_rgba(0,0,0,0.65),0_0_32px_-16px_hsl(var(--primary)/0.2)] ring-1 ring-primary/25 backdrop-blur-md sm:mx-auto sm:max-w-lg",
        )}
      >
        <div className="border-b border-primary/25 px-4 pb-3 pt-4 text-center" dir="rtl">
          <div
            className={cn(
              P17_SHEET_CARD,
              "mx-auto mb-2 flex h-12 w-12 items-center justify-center border-primary/45 bg-zinc-950/90 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.38)]",
            )}
          >
            <Rocket className="h-6 w-6 text-primary" strokeWidth={2.25} />
          </div>
          <SheetTitle className="text-base font-bold text-primary">
            {t("p17.commerce.coming_soon.sheet_title")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("p17.commerce.coming_soon.sheet_title")}
          </SheetDescription>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4" dir="rtl">
          <p className="text-sm font-medium leading-relaxed text-foreground/90">
            {t("p17.commerce.coming_soon.sheet_intro")}
          </p>
          <ul className={cn(P17_SHEET_CARD, "space-y-2 p-3")}>
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs leading-relaxed text-primary/55">
            {t("p17.commerce.coming_soon.sheet_footer")}
          </p>
        </div>

        <div
          className="border-t border-primary/20 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          dir="rtl"
        >
          <button
            type="button"
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-2xl border-2 border-primary/55 bg-zinc-950/90 text-base font-bold text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.28)] transition-[transform,box-shadow,border-color,background-color] hover:border-primary/70 hover:bg-zinc-900/95 hover:shadow-[0_0_18px_-6px_hsl(var(--primary)/0.32)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
            onClick={() => onOpenChange(false)}
          >
            {t("p17.commerce.coming_soon.ok")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

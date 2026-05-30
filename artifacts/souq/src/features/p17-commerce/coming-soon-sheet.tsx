import { Check, Package, Rocket, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  P17_SHEET_CARD,
  P17_SHEET_OK_BTN,
  P17_SHEET_OVERLAY,
  P17_SHEET_PANEL,
} from "./ad-detail-commerce-styles";

const FEATURE_KEYS = [
  "p17.commerce.coming_soon.feature_create_orders",
  "p17.commerce.coming_soon.feature_order_statuses",
  "p17.commerce.coming_soon.feature_timeline",
  "p17.commerce.coming_soon.feature_shipping_track",
  "p17.commerce.coming_soon.feature_protection",
  "p17.commerce.coming_soon.feature_seller_management",
] as const;

const ROADMAP_STEPS: Array<{ key: string; icon: LucideIcon }> = [
  { key: "p17.commerce.coming_soon.roadmap_step_browse", icon: Package },
  { key: "p17.commerce.coming_soon.roadmap_step_cart", icon: ShoppingCart },
  { key: "p17.commerce.coming_soon.roadmap_step_confirm", icon: Check },
  { key: "p17.commerce.coming_soon.roadmap_step_track", icon: Truck },
];

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
        overlayClassName={P17_SHEET_OVERLAY}
        className={P17_SHEET_PANEL}
      >
        <div className="border-b border-primary/25 px-4 pb-2.5 pt-3 text-center" dir="rtl">
          <div
            className={cn(
              P17_SHEET_CARD,
              "relative mx-auto mb-2 flex h-14 w-14 items-center justify-center border-primary/50 bg-zinc-950/90 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.42)]",
            )}
          >
            <Rocket className="h-7 w-7 text-primary" strokeWidth={2.25} aria-hidden />
            <span
              className="pointer-events-none absolute -inset-1 rounded-2xl bg-primary/10 blur-md"
              aria-hidden
            />
          </div>
          <SheetTitle className="text-base font-bold text-primary">
            {t("p17.commerce.coming_soon.sheet_title")}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs leading-relaxed text-primary/60">
            {t("p17.commerce.coming_soon.sheet_intro")}
          </SheetDescription>
        </div>

        <div className="flex flex-col gap-2.5 px-4 py-3" dir="rtl">
          <div className={cn(P17_SHEET_CARD, "p-2.5")}>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-primary/70">
              {t("p17.commerce.coming_soon.roadmap_title")}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {ROADMAP_STEPS.map(({ key, icon: Icon }, index) => (
                <div key={key} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-zinc-950/90 shadow-[0_0_12px_-8px_hsl(var(--primary)/0.28)] ring-1 ring-primary/10">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={2.25} aria-hidden />
                  </div>
                  <span className="line-clamp-2 text-[10px] font-medium leading-tight text-foreground/90">
                    {t(key)}
                  </span>
                  {index < ROADMAP_STEPS.length - 1 ? (
                    <span className="sr-only">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <ul className={cn(P17_SHEET_CARD, "grid grid-cols-1 gap-1.5 p-2.5 sm:grid-cols-2")}>
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-[13px] leading-snug text-foreground/92">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          <p className="text-center text-[11px] leading-relaxed text-primary/55">
            {t("p17.commerce.coming_soon.sheet_footer")}
          </p>
        </div>

        <div
          className="mt-auto border-t border-primary/25 bg-[#0A0A0A]/95 px-4 py-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]"
          dir="rtl"
        >
          <button type="button" className={P17_SHEET_OK_BTN} onClick={() => onOpenChange(false)}>
            {t("p17.commerce.coming_soon.ok")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

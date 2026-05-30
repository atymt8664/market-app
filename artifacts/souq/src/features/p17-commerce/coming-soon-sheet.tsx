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
        className="flex max-h-[min(88dvh,560px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0D12] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg"
      >
        <div className="border-b border-primary/20 px-4 pb-3 pt-4 text-center" dir="rtl">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)]">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <SheetTitle className="text-base font-bold text-white">
            {t("p17.commerce.coming_soon.sheet_title")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("p17.commerce.coming_soon.sheet_title")}
          </SheetDescription>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4" dir="rtl">
          <p className="text-sm font-medium text-zinc-300">{t("p17.commerce.coming_soon.sheet_intro")}</p>
          <ul className="space-y-2 rounded-2xl border border-primary/30 bg-zinc-950/80 p-3 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10">
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-xs leading-relaxed text-zinc-500">
            {t("p17.commerce.coming_soon.sheet_footer")}
          </p>
        </div>

        <div className="border-t border-primary/15 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]" dir="rtl">
          <button
            type="button"
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-full border border-primary/45 bg-zinc-950/80 text-base font-bold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/60 hover:bg-zinc-900/90 active:opacity-90",
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

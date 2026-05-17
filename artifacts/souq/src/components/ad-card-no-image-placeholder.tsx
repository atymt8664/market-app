import { ImageIcon } from "lucide-react";
import { memo } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Shared no-image tile for AdCard (6B-3).
 * Static CSS only — no blur/animation to stay cheap on weak Android at scale.
 */
export const AdCardNoImagePlaceholder = memo(function AdCardNoImagePlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]",
        className,
      )}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0c1008] to-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_38%,hsl(var(--primary)/0.14),transparent_72%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-2 px-2">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/32 bg-primary/[0.07] shadow-[0_0_22px_-10px_hsl(var(--primary)/0.42)] ring-1 ring-primary/18"
          aria-hidden
        >
          <ImageIcon
            className="h-5 w-5 text-primary/75"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <span className="max-w-[92%] text-center text-[10px] font-medium leading-tight tracking-tight text-primary/50">
          {t("ad-card.no_image")}
        </span>
      </div>
    </div>
  );
});

import { ImageIcon } from "lucide-react";
import { memo } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** Inner icon box only — not the outer NoImagePlaceholder backdrop. */
export const adCardNoImageIconBoxClassName = cn(
  "flex items-center justify-center border border-primary/32 bg-primary/[0.07]",
  "shadow-[0_0_22px_-10px_hsl(var(--primary)/0.42)] ring-1 ring-primary/18",
);

/** Home feed — icon box without outer glow shadow. */
export const adCardNoImageIconBoxSubtleClassName = cn(
  "flex items-center justify-center border border-primary/28 bg-primary/[0.05]",
  "shadow-none ring-1 ring-primary/10",
);

export const adCardNoImageIconClassName = "text-primary/75";

/** Standalone no-image block — ad detail hero, previews, read-only galleries. */
export const adNoImageBlockShellClassName = cn(
  "flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]",
  "rounded-2xl border border-primary/32 ring-1 ring-primary/10",
);

type AdNoImagePlaceholderBlockProps = {
  className?: string;
  /** i18n key — ad detail uses plural "no photos" label */
  labelKey?: "ad-card.no_image" | "ad_images_public.no_images";
  size?: "hero" | "compact";
};

export function AdNoImagePlaceholderBlock({
  className,
  labelKey = "ad_images_public.no_images",
  size = "hero",
}: AdNoImagePlaceholderBlockProps) {
  const iconBoxSize = size === "hero" ? "h-11 w-11 rounded-2xl" : "h-9 w-9 rounded-xl";
  const iconSize = size === "hero" ? "h-5 w-5" : "h-4 w-4";
  const textClass =
    size === "hero"
      ? "max-w-[92%] text-center text-[10px] font-medium leading-tight tracking-tight text-primary/50 sm:text-xs"
      : "max-w-[92%] text-center text-[10px] font-medium leading-tight text-primary/50";

  return (
    <div className={cn(adNoImageBlockShellClassName, className)} role="img" aria-label={t(labelKey)}>
      <div className="relative flex flex-col items-center gap-2 px-2">
        <div className={cn(adCardNoImageIconBoxClassName, iconBoxSize)} aria-hidden>
          <ImageIcon className={cn(iconSize, adCardNoImageIconClassName)} strokeWidth={1.75} aria-hidden />
        </div>
        <span className={textClass}>{t(labelKey)}</span>
      </div>
    </div>
  );
}

/**
 * Shared no-image tile for AdCard (6B-3).
 * Static CSS only — no blur/animation to stay cheap on weak Android at scale.
 */
export const AdCardNoImagePlaceholder = memo(function AdCardNoImagePlaceholder({
  className,
  /** Home feed: solid black backdrop only — no radial/gradient haze around inner box. */
  plainBackdrop,
  /** Smaller icon + label for profile list thumbnails. */
  compact,
  /** Home baseline: no icon-box glow shadow. */
  subtleIcon,
}: {
  className?: string;
  plainBackdrop?: boolean;
  compact?: boolean;
  subtleIcon?: boolean;
}) {
  const iconBoxClass = subtleIcon ? adCardNoImageIconBoxSubtleClassName : adCardNoImageIconBoxClassName;
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]",
        className,
      )}
      aria-hidden
    >
      {!plainBackdrop ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0c1008] to-zinc-950"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_38%,hsl(var(--primary)/0.14),transparent_72%)]"
            aria-hidden
          />
        </>
      ) : null}
      <div className={cn("relative flex flex-col items-center gap-2 px-2", compact && "gap-1 px-1")}>
        <div
          className={cn(
            iconBoxClass,
            compact ? "h-8 w-8 rounded-xl" : "h-11 w-11 rounded-2xl",
          )}
          aria-hidden
        >
          <ImageIcon
            className={cn(compact ? "h-3.5 w-3.5" : "h-5 w-5", adCardNoImageIconClassName)}
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        {!compact ? (
          <span className="max-w-[92%] text-center text-[10px] font-medium leading-tight tracking-tight text-primary/50">
            {t("ad-card.no_image")}
          </span>
        ) : null}
      </div>
    </div>
  );
});

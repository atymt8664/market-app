import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FAVORITES_CARD_SHELL,
  FEATURED_DEFAULT_CARD_W,
  FEATURED_HOME_FEED_CARD_W,
  HOME_FEED_CARD_SHELL,
} from "@/components/ad-card-shells";

/** P7-PR-8: isolated skeleton — Home must not import `ad-card.tsx` (favorite mutations + auth). */
export function AdCardSkeleton({
  featured,
  homeFeed,
  variant: _variant,
  favoritesList,
}: {
  featured?: boolean;
  homeFeed?: boolean;
  variant?: "default" | "grid";
  favoritesList?: boolean;
}) {
  const compact = Boolean(favoritesList);
  const feedCompact = Boolean(homeFeed && !favoritesList);
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden",
        compact
          ? FAVORITES_CARD_SHELL
          : feedCompact
            ? HOME_FEED_CARD_SHELL
            : "rounded-xl border border-border/45 bg-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        featured ? "h-full" : "h-auto",
        featured &&
          (feedCompact ? FEATURED_HOME_FEED_CARD_W : FEATURED_DEFAULT_CARD_W),
      )}
    >
      <Skeleton
        className={cn(
          "w-full shrink-0 rounded-none",
          feedCompact ? "bg-primary/[0.06]" : "bg-muted/40",
          compact
            ? "h-[88px] sm:h-[96px] md:h-[104px]"
            : feedCompact
              ? featured
                ? "aspect-[4/3]"
                : "aspect-[4/3]"
              : "aspect-[4/3]",
        )}
      />
      <div
        className={cn(
          "flex flex-col",
          compact
            ? "gap-1 px-1.5 pb-2 pt-1"
            : feedCompact
              ? "gap-0.5 px-1.5 pb-1.5 pt-1"
              : "gap-1.5 px-2 pb-2.5 pt-1.5",
        )}
      >
        <Skeleton
          className={cn(
            "w-full rounded-md",
            feedCompact ? "bg-primary/[0.08]" : "bg-muted/50",
            compact ? "h-[2.125rem]" : feedCompact ? "h-4" : "h-[2.5rem]",
          )}
        />
        <Skeleton
          className={cn(
            "rounded-md",
            feedCompact || compact ? "bg-primary/[0.08]" : "bg-muted/50",
            compact || feedCompact ? "h-3.5 w-2/5" : "h-[1.5rem] w-2/5",
          )}
        />
        <div
          className={cn(
            "grid grid-cols-3 items-center gap-x-0.5 border-t border-primary/15",
            compact ? "h-4 pt-1" : feedCompact ? "h-3.5 pt-0.5" : "h-5 border-border/35 pt-1.5",
          )}
        >
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
        </div>
        <Skeleton className={cn("w-full rounded", feedCompact ? "bg-primary/[0.06]" : "bg-muted/40", compact ? "h-3" : feedCompact ? "h-3" : "h-[1.25rem]")} />
      </div>
      {compact ? (
        <div className="px-0 pb-0.5 pt-0">
          <Skeleton className="h-8 w-full rounded-full bg-muted/40" />
        </div>
      ) : null}
    </div>
  );
}

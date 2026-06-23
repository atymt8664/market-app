import { cn } from "@/lib/utils";

const DOT_KEYS = [0, 1, 2] as const;

/** Kleinanzeigen-style bottom feed loader — three lime dots, no images. */
export function HomeFeedBottomLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("col-span-full flex w-full justify-center py-3 md:py-4", className)}
      data-testid="home-feed-bottom-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-[#0A0A0A]/90 px-3 py-2 shadow-[0_0_14px_-8px_hsl(var(--primary)/0.45)] ring-1 ring-primary/10">
        {DOT_KEYS.map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary animate-[home-feed-dot-bounce_900ms_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

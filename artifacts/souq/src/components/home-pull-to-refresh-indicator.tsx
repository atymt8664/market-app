import { cn } from "@/lib/utils";
import { HomePtrCircleIndicator } from "@/components/home-sa-logo-mark";
import type { HomePullToRefreshPhase } from "@/hooks/use-home-pull-to-refresh";

type HomePullToRefreshIndicatorProps = {
  pullPx: number;
  progress: number;
  phase: HomePullToRefreshPhase;
};

/** Sticky overlay — circular PTR glyph slides into gap above feed content. */
export function HomePullToRefreshIndicator({
  pullPx,
  progress,
  phase,
}: HomePullToRefreshIndicatorProps) {
  if (pullPx <= 0 && phase === "idle") return null;

  const glyphPhase =
    phase === "refreshing" ? "refreshing" : phase === "snap-back" ? "snap-back" : "pulling";
  const logoOffset = Math.max(0, pullPx - 54);

  return (
    <div
      className="pointer-events-none sticky top-0 z-30 flex h-0 w-full justify-center overflow-visible"
      data-testid="home-pull-to-refresh-indicator"
      data-ptr-phase={phase}
      data-ptr-height={Math.round(pullPx)}
      aria-hidden
    >
      <div
        className={cn("transition-transform duration-150 ease-out")}
        style={{
          transform: `translate3d(0, ${logoOffset}px, 0)`,
        }}
      >
        <HomePtrCircleIndicator progress={progress} phase={glyphPhase} />
      </div>
    </div>
  );
}

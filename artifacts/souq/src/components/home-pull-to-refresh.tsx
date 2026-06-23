import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HomePullToRefreshIndicator } from "@/components/home-pull-to-refresh-indicator";
import { useHomePullToRefresh } from "@/hooks/use-home-pull-to-refresh";

type HomePullToRefreshProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
};

/** Home-only pull-to-refresh — ads queries refetch; chrome (header/nav) untouched. */
export function HomePullToRefresh({
  scrollRef,
  enabled,
  onRefresh,
  children,
}: HomePullToRefreshProps) {
  const { pullPx, phase, progress, isActive } = useHomePullToRefresh({
    scrollRef,
    enabled,
    onRefresh,
  });

  const translateY = pullPx > 0 || phase === "refreshing" ? pullPx : 0;
  const snapBack = phase === "snap-back";

  return (
    <>
      <HomePullToRefreshIndicator pullPx={pullPx} progress={progress} phase={phase} />
      <div
        className={cn(isActive && "will-change-transform")}
        style={{
          transform: translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : undefined,
          transition: snapBack ? "transform 240ms ease-out" : undefined,
        }}
        data-home-ptr-content={isActive ? "1" : undefined}
        data-home-ptr-translate={Math.round(translateY)}
      >
        {children}
      </div>
    </>
  );
}

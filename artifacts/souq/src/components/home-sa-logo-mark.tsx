import { cn } from "@/lib/utils";

type HomePtrCircleIndicatorProps = {
  progress: number;
  phase: "pulling" | "refreshing" | "snap-back";
  className?: string;
};

const SIZE = 56;
const CX = 28;
const CY = 28;
const R = 22;
const CIRC = 2 * Math.PI * R;
const MAX_ARC = CIRC * 0.78;

/**
 * Kleinanzeigen-style PTR — outer lime arc + arrowhead on the ring; SA fixed at center.
 * Inline SVG only; no image assets.
 */
export function HomePtrCircleIndicator({
  progress,
  phase,
  className,
}: HomePtrCircleIndicatorProps) {
  const refreshing = phase === "refreshing";
  const scale = refreshing ? 1 : 0.84 + progress * 0.16;
  const opacity = phase === "snap-back" ? 0 : refreshing ? 1 : Math.min(0.5 + progress * 0.5, 1);
  const arcLen = refreshing ? MAX_ARC : Math.max(CIRC * 0.06, MAX_ARC * progress);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        "drop-shadow-[0_0_10px_hsl(var(--primary)/0.22)]",
        className,
      )}
      style={{
        width: SIZE,
        height: SIZE,
        transform: `scale(${scale})`,
        opacity,
        transition: "opacity 240ms ease-out, transform 180ms ease-out",
      }}
      data-testid="home-ptr-circle"
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden className="block overflow-visible">
        <defs>
          <filter id="home-ptr-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="home-ptr-arrowhead"
            markerWidth="5"
            markerHeight="5"
            refX="4.5"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,5 L5,2.5 Z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <circle cx={CX} cy={CY} r={13} fill="#0A0A0A" fillOpacity={0.38} />

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="hsl(var(--primary) / 0.12)"
          strokeWidth={2.5}
        />

        {/* Outer arc — grows on pull, spins on refresh; SA stays outside this group */}
        <g data-testid="home-ptr-arc">
          {refreshing ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${CX} ${CY}`}
              to={`360 ${CX} ${CY}`}
              dur="0.8s"
              repeatCount="indefinite"
            />
          ) : null}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${CIRC}`}
            markerEnd="url(#home-ptr-arrowhead)"
            transform={`rotate(-90 ${CX} ${CY})`}
            filter="url(#home-ptr-glow)"
            style={{
              transition: refreshing ? undefined : "stroke-dasharray 120ms ease-out",
            }}
          />
        </g>

        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fill="hsl(var(--primary))"
          fontFamily="Cairo, Tajawal, system-ui, sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="-0.35"
        >
          SA
        </text>
      </svg>
    </div>
  );
}

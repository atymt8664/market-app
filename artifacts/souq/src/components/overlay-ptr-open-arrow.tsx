import { cn } from "@/lib/utils";

type OverlayPtrOpenArrowProps = {
  progress: number;
  phase: "pulling" | "refreshing" | "snap-back";
  className?: string;
  testId?: string;
  glyphTestId?: string;
  rotationAttr?: string;
};

const DISC = 40;
const CX = 20;
const CY = 20;
const R = 11;

/** ~280° clockwise arc; ~80° open gap at bottom (between 320° and 40°). */
const ARC_START_DEG = 40;
const ARC_END_DEG = 320;

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Unit tangent along the arc in clockwise (SVG y-down) direction. */
function clockwiseTangent(deg: number) {
  const rad = (deg * Math.PI) / 180;
  const tx = -Math.sin(rad);
  const ty = Math.cos(rad);
  const len = Math.hypot(tx, ty);
  return { x: tx / len, y: ty / len };
}

function fmt(n: number) {
  return n.toFixed(2);
}

const arcStart = polarToXY(CX, CY, R, ARC_START_DEG);
const arcEnd = polarToXY(CX, CY, R, ARC_END_DEG);

const OPEN_ARROW_ARC = `M ${fmt(arcStart.x)} ${fmt(arcStart.y)} A ${R} ${R} 0 1 1 ${fmt(arcEnd.x)} ${fmt(arcEnd.y)}`;

const tangent = clockwiseTangent(ARC_END_DEG);
const tip = {
  x: arcEnd.x + tangent.x * 4.2,
  y: arcEnd.y + tangent.y * 4.2,
};
const base = {
  x: arcEnd.x - tangent.x * 2.4,
  y: arcEnd.y - tangent.y * 2.4,
};
const perp = { x: -tangent.y, y: tangent.x };
const headB1 = {
  x: base.x + perp.x * 2.1,
  y: base.y + perp.y * 2.1,
};
const headB2 = {
  x: base.x - perp.x * 2.1,
  y: base.y - perp.y * 2.1,
};

const OPEN_ARROW_HEAD = `M ${fmt(tip.x)} ${fmt(tip.y)} L ${fmt(headB1.x)} ${fmt(headB1.y)} L ${fmt(headB2.x)} ${fmt(headB2.y)} Z`;

const LIME = "hsl(var(--primary))";

function arrowRotationDeg(progress: number): number {
  return progress * 180;
}

/** Overlay PTR — dark disc + open lime refresh arrow (inline SVG only). */
export function OverlayPtrOpenArrow({
  progress,
  phase,
  className,
  testId = "overlay-ptr-open-arrow",
  glyphTestId = "overlay-ptr-open-arrow-glyph",
  rotationAttr = "data-overlay-ptr-rotation",
}: OverlayPtrOpenArrowProps) {
  const refreshing = phase === "refreshing";
  const fading = phase === "snap-back";

  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const scale = refreshing ? 1 : 0.76 + clampedProgress * 0.24;
  const opacity = fading ? 0 : refreshing ? 1 : 0.05 + clampedProgress * 0.95;
  const rotation = refreshing ? 0 : arrowRotationDeg(clampedProgress);
  const glyphOpacity = refreshing ? 1 : 0.2 + clampedProgress * 0.8;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-[#0A0A0A]",
        className,
      )}
      style={{
        width: DISC,
        height: DISC,
        transform: `scale(${scale})`,
        opacity,
        transition: fading
          ? "opacity 220ms ease-out, transform 180ms ease-out"
          : "opacity 90ms ease-out, transform 100ms ease-out",
      }}
      data-testid={testId}
      {...{ [rotationAttr]: rotation.toFixed(1) }}
    >
      <svg
        viewBox={`0 0 ${DISC} ${DISC}`}
        width={DISC}
        height={DISC}
        aria-hidden
        className="block overflow-visible"
      >
        <g
          data-testid={glyphTestId}
          transform={refreshing ? undefined : `rotate(${rotation} ${CX} ${CY})`}
          style={{
            opacity: glyphOpacity,
            transition: refreshing ? undefined : "transform 90ms ease-out, opacity 90ms ease-out",
          }}
        >
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
          <path
            d={OPEN_ARROW_ARC}
            fill="none"
            stroke={LIME}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path d={OPEN_ARROW_HEAD} fill={LIME} stroke="none" />
        </g>
      </svg>
    </div>
  );
}

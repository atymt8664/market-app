import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_HEIGHT_MOBILE_PX } from "@/lib/bottom-nav-layout";
import { t } from "@/i18n";

const STORAGE_KEY = "souq:create_ad:ai_fab_pos:v1";
const DRAG_THRESHOLD_PX = 6;
/** Bottom nav (layout) + safe-area — لا يغطى الشريط السفلي */
const BOTTOM_NAV_PX = BOTTOM_NAV_HEIGHT_MOBILE_PX;
const TOP_RESERVE_PX = 52;
const EDGE_PX = 8;
/** منطقة افتراضية محجوزة لأزرار النشر/المعاينة عند آخر الصفحة */
const BOTTOM_CTA_RESERVE_PX = 108;

type Point = { x: number; y: number };

function readStoredPosition(): Point | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function writeStoredPosition(pos: Point) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* quota / private mode */
  }
}

function visualBottomInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

function clampPosition(
  pos: Point,
  size: { w: number; h: number },
  bottomExtra = BOTTOM_CTA_RESERVE_PX,
): Point {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safeBottom = visualBottomInset();
  const maxX = Math.max(EDGE_PX, vw - size.w - EDGE_PX);
  const minY = TOP_RESERVE_PX;
  const maxY = Math.max(
    minY,
    vh - size.h - BOTTOM_NAV_PX - safeBottom - EDGE_PX - bottomExtra,
  );
  return {
    x: Math.min(maxX, Math.max(EDGE_PX, pos.x)),
    y: Math.min(maxY, Math.max(minY, pos.y)),
  };
}

function defaultPosition(size: { w: number; h: number }): Point {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safeBottom = visualBottomInset();
  const usableBottom =
    vh - TOP_RESERVE_PX - BOTTOM_NAV_PX - safeBottom - BOTTOM_CTA_RESERVE_PX - EDGE_PX;
  return clampPosition(
    {
      x: vw - size.w - EDGE_PX,
      y: TOP_RESERVE_PX + usableBottom * 0.14,
    },
    size,
    BOTTOM_CTA_RESERVE_PX,
  );
}

export type CreateAdDraggableAiFabProps = {
  onImprove: () => void;
  isPending: boolean;
  showHint: boolean;
};

export function CreateAdDraggableAiFab({
  onImprove,
  isPending,
  showHint,
}: CreateAdDraggableAiFabProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Point | null>(null);
  const posRef = useRef<Point>({ x: EDGE_PX, y: TOP_RESERVE_PX });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const measureAndClamp = useCallback((next: Point, bottomExtra = BOTTOM_CTA_RESERVE_PX) => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 120;
    const h = el?.offsetHeight ?? 40;
    return clampPosition(next, { w, h }, bottomExtra);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const applyInitial = () => {
      const stored = readStoredPosition();
      const size = { w: el.offsetWidth, h: el.offsetHeight };
      const initial = stored
        ? clampPosition(stored, size, BOTTOM_CTA_RESERVE_PX)
        : defaultPosition(size);
      posRef.current = initial;
      setPos(initial);
    };

    applyInitial();

    const onResize = () => {
      const clamped = measureAndClamp(posRef.current);
      posRef.current = clamped;
      setPos(clamped);
    };

    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      ro.disconnect();
    };
  }, [measureAndClamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = rootRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const next = measureAndClamp({
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
    posRef.current = next;
    setPos(next);
  };

  const finishPointer = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = rootRef.current;
    el?.releasePointerCapture(e.pointerId);
    if (drag.moved) {
      writeStoredPosition(posRef.current);
    } else if (!isPending) {
      onImprove();
    }
    dragRef.current = null;
  };

  const style =
    pos != null
      ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" as const }
      : { visibility: "hidden" as const };

  return (
    <div
      ref={rootRef}
      className="fixed z-50 flex max-w-[calc(100vw-1rem)] touch-none items-center gap-1.5"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <button
        type="button"
        disabled={isPending}
        aria-label={t("create_ad.ai.aria_label")}
        className="inline-flex h-9 cursor-grab items-center justify-center gap-1 rounded-full border border-primary/45 bg-zinc-950/92 px-2.5 text-primary shadow-[0_0_12px_-12px_hsl(var(--primary)/0.32)] transition-[transform,colors,box-shadow] hover:border-primary/60 hover:bg-zinc-900/95 hover:shadow-[0_0_16px_-12px_hsl(var(--primary)/0.4)] active:cursor-grabbing active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        <span className="text-[10px] font-medium select-none">
          {t("create_ad.ai.short_label")}
        </span>
      </button>

      <div
        className={cn(
          "max-w-[min(62vw,150px)] rounded-full border border-primary/35 bg-zinc-950/92 px-3 py-1 text-xs text-zinc-100 shadow-[0_0_14px_-12px_hsl(var(--primary)/0.28)] transition-all duration-300 select-none",
          showHint
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-2 opacity-0",
        )}
        aria-hidden={!showHint}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t("create_ad.ai.hint")}</span>
        </span>
      </div>
    </div>
  );
}

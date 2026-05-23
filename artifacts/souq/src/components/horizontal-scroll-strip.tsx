import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Native horizontal scroll for Home strips (6B-3).
 * Avoids Radix ScrollArea observers/DOM layers — better on weak Android, RTL-safe.
 *
 * Do NOT use touch-pan-x: it captures vertical page scroll when the gesture
 * starts on the strip (regression on Android). Browser axis detection + overflow-x-auto
 * is enough; overscroll-behavior-x: contain only isolates horizontal rubber-banding.
 */
export function HorizontalScrollStrip({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto overflow-y-hidden",
        "overscroll-x-contain",
        "scroll-smooth",
        "[-webkit-overflow-scrolling:touch]",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

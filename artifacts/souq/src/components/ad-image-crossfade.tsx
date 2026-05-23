/**
 * Two-layer opacity crossfade — no React key remounts, no flash (P9).
 */
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { preloadAdImage } from "@/lib/ad-image-preload";

type CrossfadeImageProps = {
  src: string;
  /** Low-res URL shown immediately while `src` decodes (thumb → hero). */
  instantSrc?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  transitionMs?: number;
  objectFit?: "cover" | "contain";
} & Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  | "loading"
  | "fetchPriority"
  | "sizes"
  | "onClick"
  | "onTouchStart"
  | "onTouchEnd"
  | "draggable"
>;

type LayerState = {
  front: 0 | 1;
  urls: [string, string];
};

export function AdImageCrossfade({
  src,
  instantSrc,
  alt,
  className,
  imgClassName,
  transitionMs = 150,
  objectFit = "cover",
  loading = "eager",
  fetchPriority,
  sizes,
  onClick,
  onTouchStart,
  onTouchEnd,
  draggable = false,
}: CrossfadeImageProps) {
  const visibleRef = useRef(src);
  const [layers, setLayers] = useState<LayerState>(() => ({
    front: 0,
    urls: [src, src],
  }));

  useEffect(() => {
    if (!src || src === visibleRef.current) return;

    let cancelled = false;

    const swapTo = (url: string) => {
      if (cancelled || !url || url === visibleRef.current) return;
      visibleRef.current = url;
      setLayers((prev) => {
        const back = (1 - prev.front) as 0 | 1;
        const urls: [string, string] = [prev.urls[0], prev.urls[1]];
        urls[back] = url;
        return { front: back, urls };
      });
    };

    const showInstant =
      instantSrc &&
      instantSrc !== src &&
      instantSrc !== visibleRef.current;

    if (showInstant) {
      swapTo(instantSrc);
    }

    void preloadAdImage(src).then(() => {
      if (!cancelled) swapTo(src);
    });

    return () => {
      cancelled = true;
    };
  }, [src, instantSrc]);

  const transitionStyle = { transitionDuration: `${transitionMs}ms` };

  return (
    <div className={cn("size-full overflow-hidden", className)}>
      {([0, 1] as const).map((i) => {
        const url = layers.urls[i];
        if (!url) return null;
        const isFront = layers.front === i;
        return (
          <img
            key={i}
            src={url}
            alt={isFront ? alt : ""}
            aria-hidden={!isFront}
            className={cn(
              "absolute inset-0 h-full w-full transition-opacity ease-out",
              objectFit === "contain" ? "object-contain" : "object-cover",
              isFront ? "z-[1] opacity-100" : "z-0 opacity-0",
              imgClassName,
            )}
            style={transitionStyle}
            loading={loading}
            fetchPriority={fetchPriority}
            sizes={sizes}
            decoding="async"
            draggable={draggable}
            onClick={isFront ? onClick : undefined}
            onTouchStart={isFront ? onTouchStart : undefined}
            onTouchEnd={isFront ? onTouchEnd : undefined}
          />
        );
      })}
    </div>
  );
}

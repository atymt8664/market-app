/**
 * Read-only image gallery for public ad detail (P9).
 * Crossfade layers + decode-ahead preload — no framer-motion on critical path.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AdNoImagePlaceholderBlock } from "@/components/ad-card-no-image-placeholder";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { AdImageCrossfade } from "@/components/ad-image-crossfade";
import {
  getAdImageHeroUrl,
  getAdImageThumbUrl,
  getAdImageViewerUrl,
} from "@/lib/ad-image-url";
import {
  adImageListEqual,
  preloadAdImageAll,
  preloadAdImageNeighbors,
} from "@/lib/ad-image-preload";

type AdImagesPublicProps = {
  images: string[];
  title: string;
};

function AdImagesPublicInner({ images, title }: AdImagesPublicProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const viewerIndexRef = useRef(viewerIndex);
  viewerIndexRef.current = viewerIndex;

  const count = images.length;
  const heroUrls = useMemo(
    () => images.map((src) => getAdImageHeroUrl(src)),
    [images],
  );
  const thumbUrls = useMemo(
    () => images.map((src) => getAdImageThumbUrl(src)),
    [images],
  );
  const viewerUrls = useMemo(
    () => images.map((src) => getAdImageViewerUrl(src)),
    [images],
  );

  const safeHeroIndex = count > 0 ? Math.min(heroIndex, count - 1) : 0;
  const safeViewerIndex = count > 0 ? Math.min(viewerIndex, count - 1) : 0;
  const heroSrc = count > 0 ? heroUrls[safeHeroIndex] : "";
  const viewerSrc = count > 0 ? viewerUrls[safeViewerIndex] : "";

  const prevHeroIndexRef = useRef(safeHeroIndex);
  const heroInstantSrc =
    count > 0 && prevHeroIndexRef.current !== safeHeroIndex
      ? thumbUrls[safeHeroIndex]
      : undefined;

  useEffect(() => {
    prevHeroIndexRef.current = safeHeroIndex;
  }, [safeHeroIndex]);

  useEffect(() => {
    setHeroIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  useEffect(() => {
    preloadAdImageAll(heroUrls);
  }, [heroUrls]);

  useEffect(() => {
    preloadAdImageNeighbors(heroUrls, safeHeroIndex);
  }, [safeHeroIndex, heroUrls]);

  useEffect(() => {
    if (!viewerOpen) return;
    preloadAdImageNeighbors(viewerUrls, safeViewerIndex);
  }, [viewerOpen, safeViewerIndex, viewerUrls]);

  const openViewer = useCallback(
    (index: number) => {
      setViewerIndex(Math.min(Math.max(0, index), Math.max(0, count - 1)));
      setViewerOpen(true);
    },
    [count],
  );

  const closeViewer = useCallback(() => {
    setHeroIndex(viewerIndexRef.current);
    setViewerOpen(false);
  }, []);

  const nextImage = useCallback(() => {
    if (count <= 1) return;
    setViewerIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevImage = useCallback(() => {
    if (count <= 1) return;
    setViewerIndex((prev) => (prev === 0 ? count - 1 : prev - 1));
  }, [count]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, nextImage, prevImage, closeViewer]);

  useEffect(() => {
    if (viewerOpen && count === 0) closeViewer();
    else if (viewerOpen && viewerIndex >= count) {
      setViewerIndex(Math.max(0, count - 1));
    }
  }, [viewerOpen, count, viewerIndex, closeViewer]);

  const handleThumbClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeroIndex(index);
  }, []);

  const handleViewerTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  }, []);

  const handleViewerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartXRef.current;
      const endX = e.changedTouches[0]?.clientX;
      if (startX === null || typeof endX !== "number") return;
      const deltaX = endX - startX;
      if (deltaX > 48) prevImage();
      if (deltaX < -48) nextImage();
    },
    [nextImage, prevImage],
  );

  if (count === 0) {
    return motionlessEmpty();
  }

  const heroSizes =
    "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, min(820px, 94vw)";

  return (
    <>
      <div className={cn("space-y-2", count > 1 && "space-y-1.5")}>
        <button
          type="button"
          onClick={() => openViewer(heroIndex)}
          data-ad-detail-shell="gallery"
          className={cn(
            "relative w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/30",
            count <= 1
              ? "aspect-[4/3] sm:aspect-[16/10] max-h-[min(340px,62vh)] sm:max-h-[360px]"
              : "aspect-[4/3] sm:aspect-[16/10] max-h-[min(320px,58vh)] sm:max-h-[340px]",
            "shadow-sm transition-[box-shadow,transform] duration-200",
            "hover:shadow-md active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            "touch-manipulation",
          )}
          aria-label={t("ad_images_public.open_gallery")}
        >
          <AdImageCrossfade
            src={heroSrc}
            instantSrc={heroInstantSrc}
            alt={t("ad_images_public.photo_of", {
              current: heroIndex + 1,
              total: count,
            })}
            className="absolute inset-0 size-full"
            loading="eager"
            fetchPriority={heroIndex === 0 ? "high" : "auto"}
            sizes={heroSizes}
            transitionMs={120}
          />
          <span
            dir="ltr"
            className={cn(
              "absolute z-10 rounded-md bg-black/85 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-md ring-1 ring-white/10",
              "left-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))]",
            )}
            aria-live="polite"
          >
            {heroIndex + 1} / {count}
          </span>
          <span className="sr-only">
            {t("ad_images_public.photo_of", { current: heroIndex + 1, total: count })}
          </span>
        </button>

        {count > 1 && (
          <div
            className="flex gap-1.5 overflow-x-auto pb-0.5 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            dir={isAr ? "rtl" : "ltr"}
          >
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={(e) => handleThumbClick(i, e)}
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-[border-color,transform] duration-150",
                  "touch-manipulation active:scale-[0.98]",
                  i === heroIndex
                    ? "border-primary ring-2 ring-primary/35 ring-offset-2 ring-offset-background"
                    : "border-border/70 hover:border-primary/40",
                )}
                aria-label={t("ad_images_public.view_photo_in_preview", { index: i + 1 })}
                aria-pressed={i === heroIndex}
              >
                <img
                  src={thumbUrls[i]}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  sizes="68px"
                />
                <span
                  dir="ltr"
                  className="absolute bottom-1 start-1 rounded bg-black/65 px-1 py-0.5 text-[9px] font-medium tabular-nums text-white"
                >
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewerOpen && count > 0 && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={t("ad_images_public.gallery_aria")}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={closeViewer}
              className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-[0.96]"
              aria-label={t("ad_images_public.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <span dir="ltr" className="text-sm font-medium tabular-nums text-white">
              {viewerIndex + 1} / {count}
            </span>
            <div className="h-10 w-10 shrink-0" aria-hidden />
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-0 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute start-2 z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-white/10 text-white active:scale-[0.96] md:start-4"
              aria-label={t("ad_images_public.previous_photo")}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <AdImageCrossfade
              src={viewerSrc}
              alt={t("ad_images_public.image_alt", {
                title,
                index: viewerIndex + 1,
              })}
              className="relative h-[min(78vh,calc(100dvh-8rem))] w-[94vw] max-w-[94vw]"
              objectFit="contain"
              loading="eager"
              sizes="94vw"
              transitionMs={120}
              onTouchStart={handleViewerTouchStart}
              onTouchEnd={handleViewerTouchEnd}
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute end-2 z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-white/10 text-white active:scale-[0.96] md:end-4"
              aria-label={t("ad_images_public.next_photo")}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <p className="shrink-0 px-4 pb-4 text-center text-[11px] text-white/55">
            {t("ad_images_public.swipe_hint")}
          </p>
        </div>
      )}
    </>
  );
}

function motionlessEmpty() {
  return (
    <AdNoImagePlaceholderBlock className="h-[6.5rem] max-h-[7rem] w-full sm:h-[7rem]" />
  );
}

export const AdImagesPublic = memo(AdImagesPublicInner, (prev, next) => {
  return prev.title === next.title && adImageListEqual(prev.images, next.images);
});

AdImagesPublic.displayName = "AdImagesPublic";

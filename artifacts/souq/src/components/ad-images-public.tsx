/**
 * Read-only image gallery for public ad detail.
 * Not used on create/edit flows — those use CreateAdImageGallery.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

type AdImagesPublicProps = {
  images: string[];
  title: string;
};

export function AdImagesPublic({ images, title }: AdImagesPublicProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  /** Large preview index — mirrors create/edit hero; thumbnails update this without opening fullscreen. */
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const touchStartXRef = useRef<number | null>(null);
  const viewerIndexRef = useRef(viewerIndex);
  viewerIndexRef.current = viewerIndex;

  const count = images.length;
  const heroSrc = count > 0 ? images[Math.min(heroIndex, count - 1)] : "";

  useEffect(() => {
    setHeroIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  const openViewer = (index: number) => {
    setViewerIndex(Math.min(Math.max(0, index), Math.max(0, count - 1)));
    setViewerOpen(true);
  };

  const closeViewer = useCallback(() => {
    setHeroIndex(viewerIndexRef.current);
    setViewerOpen(false);
  }, []);

  const nextImage = useCallback(() => {
    if (count <= 1) return;
    setSlideDir(1);
    setViewerIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prevImage = useCallback(() => {
    if (count <= 1) return;
    setSlideDir(-1);
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

  const handleThumbClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeroIndex(index);
  };

  if (count === 0) {
    return (
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-2xl overflow-hidden bg-muted/60 border border-border flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
        {t("ad_images_public.no_images")}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => openViewer(heroIndex)}
          className={cn(
            "relative w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/30",
            "aspect-[4/3] sm:aspect-[16/10] max-h-[min(380px,70vh)] sm:max-h-[380px]",
            "shadow-sm transition-[box-shadow,transform] duration-200",
            "hover:shadow-md active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          )}
          aria-label={t("ad_images_public.open_gallery")}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={heroSrc}
              src={heroSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading={heroIndex === 0 ? "eager" : "lazy"}
              initial={{ opacity: 0.88 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.88 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
          <span
            dir="ltr"
            className={cn(
              "absolute z-10 rounded-md bg-black/85 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-md ring-1 ring-white/10 backdrop-blur-sm",
              /* Physical bottom-left; header controls are top-only */
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
            className="flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            dir={isAr ? "rtl" : "ltr"}
          >
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={(e) => handleThumbClick(i, e)}
                className={cn(
                  "relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl border-2 transition-[box-shadow,transform,border-color] duration-200",
                  i === heroIndex
                    ? "border-primary ring-2 ring-primary/35 ring-offset-2 ring-offset-background"
                    : "border-border/70 hover:border-primary/40 active:scale-[0.98]",
                )}
                aria-label={t("ad_images_public.view_photo_in_preview", { index: i + 1 })}
                aria-pressed={i === heroIndex}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t("ad_images_public.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <span dir="ltr" className="tabular-nums text-sm font-medium text-white">
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
              className="absolute start-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:start-4"
              aria-label={t("ad_images_public.previous_photo")}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <AnimatePresence initial={false} custom={slideDir} mode="wait">
              <motion.div
                key={viewerIndex}
                custom={slideDir}
                initial={{ opacity: 0, x: slideDir * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDir * -28 }}
                transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
                className="flex max-h-[min(78vh,calc(100dvh-8rem))] max-w-[94vw] items-center justify-center"
              >
                <img
                  src={images[viewerIndex]}
                  alt={t("ad_images_public.image_alt", { title, index: viewerIndex + 1 })}
                  className="max-h-[min(78vh,calc(100dvh-8rem))] max-w-[94vw] select-none object-contain"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => {
                    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const startX = touchStartXRef.current;
                    const endX = e.changedTouches[0]?.clientX;
                    if (startX === null || typeof endX !== "number") return;
                    const deltaX = endX - startX;
                    if (deltaX > 48) prevImage();
                    if (deltaX < -48) nextImage();
                  }}
                />
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute end-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:end-4"
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

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AdNoImagePlaceholderBlock } from "@/components/ad-card-no-image-placeholder";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

type CreateAdImageGalleryProps = {
  uploadedImages: string[];
  maxImages: number;
  isSubmittingUploads: boolean;
  /** When true: no add/remove; lightbox for viewing only (e.g. ad detail). */
  readOnly?: boolean;
  onPickFiles?: () => void;
  /** Remove by index — full-screen viewer; ignored when readOnly */
  onRemoveAt?: (index: number) => void;
};

export function CreateAdImageGallery({
  uploadedImages,
  maxImages,
  isSubmittingUploads,
  readOnly = false,
  onPickFiles,
  onRemoveAt,
}: CreateAdImageGalleryProps) {
  const pickFiles = onPickFiles ?? (() => {});
  const removeAt = onRemoveAt ?? ((_i: number) => {});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  /** Which image is shown on the large hero (order in array unchanged: index 0 = first selected). */
  const [heroIndex, setHeroIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const count = uploadedImages.length;
  const heroSrc = count > 0 ? uploadedImages[Math.min(heroIndex, count - 1)] : "";

  useEffect(() => {
    setHeroIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);

  const openViewer = (index: number) => {
    setViewerIndex(Math.min(Math.max(0, index), Math.max(0, count - 1)));
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setDeleteConfirmOpen(false);
    setHeroIndex(viewerIndex);
    setViewerOpen(false);
  };

  const nextInViewer = useCallback(() => {
    if (count <= 1) return;
    setSlideDir(1);
    setViewerIndex((i) => (i + 1) % count);
  }, [count]);

  const prevInViewer = useCallback(() => {
    if (count <= 1) return;
    setSlideDir(-1);
    setViewerIndex((i) => (i === 0 ? count - 1 : i - 1));
  }, [count]);

  const deleteInViewer = () => {
    if (readOnly || count === 0) return;
    const idx = viewerIndex;
    const newCount = count - 1;
    removeAt(idx);
    setDeleteConfirmOpen(false);
    if (newCount === 0) {
      closeViewer();
      return;
    }
    setViewerIndex(() => {
      if (idx >= newCount) return newCount - 1;
      return idx;
    });
  };

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (deleteConfirmOpen) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") prevInViewer();
      if (e.key === "ArrowRight") nextInViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, nextInViewer, prevInViewer, deleteConfirmOpen]);

  useEffect(() => {
    if (!deleteConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteConfirmOpen]);

  useEffect(() => {
    if (viewerOpen && count === 0) {
      closeViewer();
    } else if (viewerOpen && viewerIndex >= count) {
      setViewerIndex(Math.max(0, count - 1));
    }
  }, [viewerOpen, count, viewerIndex]);

  const handleThumbClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHeroIndex(index);
  };

  return (
    <>
      {count === 0 && readOnly && (
        <AdNoImagePlaceholderBlock className="min-h-[180px] w-full" />
      )}
      {count === 0 && !readOnly && (
        <button
          type="button"
          onClick={pickFiles}
          disabled={isSubmittingUploads}
          className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-zinc-950/80 px-3 py-2.5 text-right shadow-[0_0_20px_-12px_hsl(var(--primary)/0.2)] transition-[colors,transform,background-color,box-shadow] duration-200 hover:border-primary/55 hover:bg-zinc-900/70 active:scale-[0.995] disabled:opacity-50 sm:px-4"
          dir="rtl"
        >
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight text-foreground">
              {isSubmittingUploads ? t("create_ad.images.uploading") : t("create_ad.images.add_clear_photos")}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
              {t("create_ad.images.up_to_photos_tap_to_choose", { count: maxImages })}
            </span>
          </div>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-zinc-950/90 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.35)]">
            {isSubmittingUploads ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-primary text-black flex items-center justify-center">
                  <Plus className="w-2.5 h-2.5" />
                </span>
              </>
            )}
          </div>
        </button>
      )}

      {count > 0 && heroSrc && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => openViewer(heroIndex)}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-zinc-950/50",
              "aspect-[4/3] max-h-[min(52vw,13.5rem)] sm:max-h-none sm:aspect-[16/10] shadow-[0_0_18px_-12px_hsl(var(--primary)/0.15)] transition-[box-shadow,transform] duration-200",
              "hover:shadow-[0_0_22px_-10px_hsl(var(--primary)/0.22)] active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
            aria-label={t("create_ad.images.open_gallery")}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={heroSrc}
                src={heroSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                initial={{ opacity: 0.88 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.88 }}
                transition={{ duration: 0.2 }}
              />
            </AnimatePresence>
            <span
              dir="ltr"
              className="absolute top-2.5 left-2.5 rounded-md bg-black/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-white shadow-md ring-1 ring-black/20 backdrop-blur-sm"
              aria-live="polite"
            >
              {heroIndex + 1} / {count}
            </span>
            <span className="sr-only">
              {t("create_ad.images.photo_of", { current: heroIndex + 1, total: count })}
            </span>
          </button>

          {count > 1 && (
            <div
              className="flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              dir="rtl"
            >
              {uploadedImages.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={(e) => handleThumbClick(i, e)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-[box-shadow,transform,border-color] duration-200",
                    i === heroIndex
                      ? "border-primary ring-2 ring-primary/35 ring-offset-2 ring-offset-[#0A0A0A]"
                      : "border-primary/35 hover:border-primary/55 active:scale-[0.98]",
                  )}
                  aria-label={t("create_ad.images.view_photo_in_preview", { index: i + 1 })}
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
      )}

      {count > 0 && count < maxImages && !readOnly && (
        <button
          type="button"
          onClick={pickFiles}
          disabled={isSubmittingUploads}
          className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-zinc-950/70 px-3 py-2 text-zinc-400 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] transition-[colors,transform,box-shadow] duration-200 hover:border-primary/50 hover:text-primary active:scale-[0.995] disabled:opacity-50"
          dir="rtl"
        >
          {isSubmittingUploads ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <Plus className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="text-xs font-medium">
            {isSubmittingUploads ? t("create_ad.images.uploading") : t("create_ad.images.add_photos")}
          </span>
          <span dir="ltr" className="ms-auto text-[11px] tabular-nums text-zinc-500">
            {count} / {maxImages}
          </span>
        </button>
      )}

      {viewerOpen && count > 0 && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={t("create_ad.images.gallery_aria")}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={closeViewer}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t("create_ad.images.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <span dir="ltr" className="tabular-nums text-sm font-medium text-white">
              {viewerIndex + 1} / {count}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmOpen(true);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/85 text-white transition-colors hover:bg-red-500"
                aria-label={t("create_ad.images.delete_photo")}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            {readOnly && <span className="w-10 shrink-0" aria-hidden />}
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-0 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevInViewer();
              }}
              className="absolute start-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:start-4"
              aria-label={t("create_ad.images.previous_photo")}
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
                  src={uploadedImages[viewerIndex]}
                  alt=""
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
                    if (deltaX > 48) prevInViewer();
                    if (deltaX < -48) nextInViewer();
                  }}
                />
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextInViewer();
              }}
              className="absolute end-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white md:end-4"
              aria-label={t("create_ad.images.next_photo")}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <p className="shrink-0 px-4 pb-4 text-center text-[11px] text-white/55">
            {t("create_ad.images.swipe_hint")}
          </p>
        </div>
      )}

      {deleteConfirmOpen && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-black/70"
            aria-hidden
            onClick={() => setDeleteConfirmOpen(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[110] w-[min(calc(100vw-2rem),20rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-4 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-image-confirm-title"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-image-confirm-title" className="text-sm font-semibold text-foreground">
              {t("create_ad.images.delete_confirm_title")}
            </p>
            <div className="mt-4 flex flex-row-reverse gap-2 justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="min-w-[5rem]"
                onClick={() => deleteInViewer()}
              >
                {t("create_ad.images.delete")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-[5rem]"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

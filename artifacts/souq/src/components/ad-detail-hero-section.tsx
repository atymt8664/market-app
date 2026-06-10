/**
 * Isolated ad-detail hero (gallery + top actions) — memoized so like/fav
 * toggles on the rest of the page do not re-render the image gallery (P9).
 */
import { memo } from "react";
import { Link } from "wouter";
import { ArrowRight, Heart, Share2 } from "lucide-react";
import { AdImagesPublic } from "@/components/ad-images-public";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { adImageListEqual } from "@/lib/ad-image-preload";

const floatingHeaderBtn =
  "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-primary/55 bg-[#0A0A0A]/90 text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.38)] transition-[transform,colors,box-shadow] duration-150 hover:border-primary/70 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.45)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";

type AdDetailHeroSectionProps = {
  pageMax: string;
  images: string[];
  title: string;
  isFavorited: boolean;
  favBusy: boolean;
  onShare: () => void;
  onToggleFavorite: () => void;
};

function AdDetailHeroSectionInner({
  pageMax,
  images,
  title,
  isFavorited,
  favBusy,
  onShare,
  onToggleFavorite,
}: AdDetailHeroSectionProps) {
  return (
    <div className={`${pageMax} pb-1 space-y-1`}>
      <div className="flex items-center justify-between gap-3 py-1.5 md:py-2.5">
        <Link href="/" className="shrink-0">
          <button
            type="button"
            className={floatingHeaderBtn}
            aria-label={t("common.back")}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onShare}
            className={floatingHeaderBtn}
            aria-label={t("ad_detail.copy_link")}
          >
            <Share2 className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={t("ad_detail.favorite")}
            disabled={favBusy}
            className={floatingHeaderBtn}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                isFavorited ? "fill-primary text-primary" : "text-primary",
              )}
              strokeWidth={2.25}
            />
          </button>
        </div>
      </div>
      <AdImagesPublic images={images} title={title} />
    </div>
  );
}

export const AdDetailHeroSection = memo(AdDetailHeroSectionInner, (prev, next) => {
  return (
    prev.pageMax === next.pageMax &&
    prev.title === next.title &&
    prev.isFavorited === next.isFavorited &&
    prev.favBusy === next.favBusy &&
    adImageListEqual(prev.images, next.images)
  );
});

AdDetailHeroSection.displayName = "AdDetailHeroSection";

export { floatingHeaderBtn as adDetailFloatingHeaderBtnClass };

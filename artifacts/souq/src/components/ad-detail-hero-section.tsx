/**
 * Isolated ad-detail hero (gallery + top actions) — memoized so like/fav
 * toggles on the rest of the page do not re-render the image gallery (P9).
 */
import { memo } from "react";
import { Link } from "wouter";
import { ArrowRight, Heart, Share2 } from "lucide-react";
import { AdImagesPublic } from "@/components/ad-images-public";
import { cn } from "@/lib/utils";
import {
  TAB_PAGE_HEADER_ACTION_BTN,
  TAB_PAGE_HEADER_ACTION_ICON,
  TAB_PAGE_HEADER_ACTIONS_GAP,
} from "@/lib/tab-page-header-styles";
import { t } from "@/i18n";
import { adImageListEqual } from "@/lib/ad-image-preload";

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
      <div className="flex items-center justify-between gap-3 py-1 md:py-1.5">
        <Link href="/" className="shrink-0">
          <button
            type="button"
            className={cn(TAB_PAGE_HEADER_ACTION_BTN, "touch-manipulation active:scale-[0.96]")}
            aria-label={t("common.back")}
          >
            <ArrowRight className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
        </Link>
        <div className={cn("flex", TAB_PAGE_HEADER_ACTIONS_GAP)}>
          <button
            type="button"
            onClick={onShare}
            className={cn(TAB_PAGE_HEADER_ACTION_BTN, "touch-manipulation active:scale-[0.96]")}
            aria-label={t("ad_detail.copy_link")}
          >
            <Share2 className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={t("ad_detail.favorite")}
            disabled={favBusy}
            className={cn(TAB_PAGE_HEADER_ACTION_BTN, "touch-manipulation active:scale-[0.96]")}
          >
            <Heart
              className={cn(
                TAB_PAGE_HEADER_ACTION_ICON,
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

export { TAB_PAGE_HEADER_ACTION_BTN as adDetailFloatingHeaderBtnClass };

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
  TAB_PAGE_HEADER_INNER_ROW,
  TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT,
} from "@/lib/tab-page-header-styles";
import { TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS } from "@/lib/tab-ios-layout";
import { platformTopActionsDomProps } from "@/lib/platform-header-safe-area";
import { t } from "@/i18n";
import { adImageListEqual } from "@/lib/ad-image-preload";

type AdDetailHeroSectionProps = {
  pageInset: string;
  images: string[];
  title: string;
  isFavorited: boolean;
  favBusy: boolean;
  onShare: () => void;
  onToggleFavorite: () => void;
};

function AdDetailHeroSectionInner({
  pageInset,
  images,
  title,
  isFavorited,
  favBusy,
  onShare,
  onToggleFavorite,
}: AdDetailHeroSectionProps) {
  return (
    <div className={cn(pageInset, "pb-1")}>
      <div
        {...platformTopActionsDomProps()}
        className={cn(
          TAB_PAGE_HEADER_INNER_ROW,
          TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS,
          "pb-2 pt-3 md:pt-4",
        )}
      >
        <Link href="/" className="shrink-0">
          <button
            type="button"
            className={cn(TAB_PAGE_HEADER_ACTION_BTN, "touch-manipulation active:scale-[0.96]")}
            aria-label={t("common.back")}
          >
            <ArrowRight className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
        </Link>
        <div className={TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT}>
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
      </div>
      <div className="mt-2 md:mt-2.5">
        <AdImagesPublic images={images} title={title} />
      </div>
    </div>
  );
}

export const AdDetailHeroSection = memo(AdDetailHeroSectionInner, (prev, next) => {
  return (
    prev.pageInset === next.pageInset &&
    prev.title === next.title &&
    prev.isFavorited === next.isFavorited &&
    prev.favBusy === next.favBusy &&
    adImageListEqual(prev.images, next.images)
  );
});

AdDetailHeroSection.displayName = "AdDetailHeroSection";

export { TAB_PAGE_HEADER_ACTION_BTN as adDetailFloatingHeaderBtnClass };

/** BottomNav chrome height — keep in sync with `layout.tsx` BottomNav slot sizing. */
export const BOTTOM_NAV_HEIGHT_MOBILE_PX = 50;
export const BOTTOM_NAV_HEIGHT_MD_PX = 56;

/** Layout content padding above fixed BottomNav */
export const BOTTOM_NAV_CONTENT_PADDING_CLASS =
  "pb-[calc(50px+env(safe-area-inset-bottom,0px))] md:pb-[calc(56px+env(safe-area-inset-bottom,0px))]";

/** Negative margin for full-bleed pages that restore scroll clearance via a spacer */
export const BOTTOM_NAV_SCROLL_OFFSET_CLASS =
  "-mb-[calc(50px+env(safe-area-inset-bottom,0px))] md:-mb-[calc(56px+env(safe-area-inset-bottom,0px))]";

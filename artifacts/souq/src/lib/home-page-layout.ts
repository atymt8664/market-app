import { cn } from "@/lib/utils";

/** Shared horizontal rhythm for Home — header, categories, featured, recommended. */
export const HOME_PAGE_SHELL = "mx-auto w-full max-w-screen-xl";

export const HOME_PAGE_GUTTER = "px-4 md:px-6 lg:px-8";

export const HOME_PAGE_INSET = cn(HOME_PAGE_SHELL, HOME_PAGE_GUTTER);

/** Tighter horizontal inset for Home ad grids only — section titles keep HOME_PAGE_INSET. */
export const HOME_FEED_ADS_GUTTER = "px-2 md:px-4 lg:px-6";

export const HOME_FEED_ADS_INSET = cn(HOME_PAGE_SHELL, HOME_FEED_ADS_GUTTER);

/** P9-3D: search row below safe-area — shell inline padding must stay in sync (6px mobile). */
export const HOME_HEADER_SEARCH_ROW_CLASS =
  "flex items-center gap-2 pt-1.5 pb-0 max-md:pt-1.5 md:pt-3 -mx-2 md:-mx-3 lg:-mx-4";

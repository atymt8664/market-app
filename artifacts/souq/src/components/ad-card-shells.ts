/** Shared AdCard layout tokens — safe to import from Home cold path (no favorite/API hooks). */

export const FAVORITES_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)]";

export const HOME_FEED_CARD_SHELL =
  "rounded-xl border border-primary/30 bg-[#0A0A0A] ring-1 ring-primary/8 shadow-none transition-none";

export const FEATURED_HOME_FEED_CARD_W =
  "w-[168px] max-w-[168px] shrink-0 sm:w-[172px] sm:max-w-[172px] md:w-[175px] md:max-w-[175px]";

export const FEATURED_DEFAULT_CARD_W =
  "w-[136px] max-w-[136px] shrink-0 sm:w-[148px] sm:max-w-[148px] md:w-[160px] md:max-w-[160px]";

/** P9-E: intrinsic 4:3 dimensions for Home feed imgs — matches shell LCP + Supabase transforms (CLS). */
export const FEATURED_LEAD_IMG_W = 168;
export const FEATURED_LEAD_IMG_H = 126;
export const HOME_FEED_IMG_W = 400;
export const HOME_FEED_IMG_H = 300;

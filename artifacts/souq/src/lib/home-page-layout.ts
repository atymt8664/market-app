import { cn } from "@/lib/utils";

/** Shared horizontal rhythm for Home — header, categories, featured, recommended. */
export const HOME_PAGE_SHELL = "mx-auto w-full max-w-screen-xl";

export const HOME_PAGE_GUTTER = "px-4 md:px-6 lg:px-8";

export const HOME_PAGE_INSET = cn(HOME_PAGE_SHELL, HOME_PAGE_GUTTER);

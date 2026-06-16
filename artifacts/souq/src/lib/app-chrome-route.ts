/**
 * P9-3 — App Chrome L1 route resolver (tab-title variants).
 * Authority: docs/architecture/P09-3-App-Shell-Contract.md §11
 */

export type AppChromeTabTitleRoute =
  | "favorites"
  | "messages"
  | "create-ad"
  | "profile";

export type AppChromeRouteConfig =
  | { kind: "none" }
  | {
      kind: "tab-title";
      route: AppChromeTabTitleRoute;
      titleKey: string;
      /** RTL default for tab chrome (matches existing tab pages). */
      dir: "rtl" | "ltr";
      maxWidthClass: string;
    };

const TAB_TITLE_MAX = {
  favorites: "max-w-screen-2xl",
  messages: "max-w-[820px]",
  "create-ad": "max-w-[900px] md:max-w-[760px] lg:max-w-[860px]",
  profile: "max-w-screen-sm md:max-w-[760px] lg:max-w-[860px]",
} as const;

/** Resolve L1 tab-title chrome for pathname (home-search stays in home.tsx until shell handoff retires). */
export function resolveAppChromeRoute(pathname: string): AppChromeRouteConfig {
  if (pathname === "/favorites") {
    return {
      kind: "tab-title",
      route: "favorites",
      titleKey: "favorites.title",
      dir: "rtl",
      maxWidthClass: TAB_TITLE_MAX.favorites,
    };
  }
  if (pathname === "/messages") {
    return {
      kind: "tab-title",
      route: "messages",
      titleKey: "messages.title",
      dir: "rtl",
      maxWidthClass: TAB_TITLE_MAX.messages,
    };
  }
  if (
    pathname === "/new" ||
    pathname === "/create-ad" ||
    pathname.startsWith("/edit/")
  ) {
    return {
      kind: "tab-title",
      route: "create-ad",
      titleKey: "create_ad.create_title",
      dir: "rtl",
      maxWidthClass: TAB_TITLE_MAX["create-ad"],
    };
  }
  if (pathname === "/profile") {
    return {
      kind: "tab-title",
      route: "profile",
      titleKey: "profile.title",
      dir: "rtl",
      maxWidthClass: TAB_TITLE_MAX.profile,
    };
  }
  return { kind: "none" };
}

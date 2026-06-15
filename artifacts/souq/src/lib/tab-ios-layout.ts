/**
 * P9-3H-iOS — Tab page safe-area normalization (Bottom Nav pages only; Home frozen).
 * env() resolves to 0 on Android browser → no visual change there.
 * --souq-safe-top (P9-3E bootstrap) covers A2HS / standalone when env() is flaky.
 */

/** Sticky tab headers — clears notch / status bar on iPhone WebKit. */
export const TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS =
  "pt-[var(--souq-safe-top,env(safe-area-inset-top,0px))]";

/** Profile / pages without sticky header — content start below safe area. */
export const TAB_IOS_CONTENT_SAFE_TOP_CLASS =
  "pt-[calc(var(--souq-safe-top,env(safe-area-inset-top,0px))+0.5rem)] md:pt-[calc(var(--souq-safe-top,env(safe-area-inset-top,0px))+0.75rem)]";

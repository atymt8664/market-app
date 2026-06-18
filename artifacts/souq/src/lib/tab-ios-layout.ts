/**
 * P9-3H-iOS / P9-IOS-A2HS — re-exports platform header safe-top SSOT.
 * @see platform-header-safe-area.ts
 */

export {
  PLATFORM_HEADER_SAFE_TOP_CLASS,
  PLATFORM_HEADER_SAFE_TOP_CLASS as TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS,
  PLATFORM_HEADER_MARKER,
  PLATFORM_HEADER_MARKER_VALUE,
  platformHeaderDomProps,
  platformTopActionsDomProps,
  PLATFORM_TOP_ACTIONS_MARKER,
} from "@/lib/platform-header-safe-area";

import { PLATFORM_HEADER_SAFE_TOP_CLASS } from "@/lib/platform-header-safe-area";

/** Profile / pages without header — content start below safe area. */
export const TAB_IOS_CONTENT_SAFE_TOP_CLASS =
  `pt-[calc(var(--souq-safe-top,env(safe-area-inset-top,0px))+0.5rem)] md:pt-[calc(var(--souq-safe-top,env(safe-area-inset-top,0px))+0.75rem)]`;

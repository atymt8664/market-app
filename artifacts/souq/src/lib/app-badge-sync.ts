import { resolveNavigatorBadgeCount } from "@/lib/app-badge-counters";

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: (() => Promise<void>) | undefined;
};

export function syncNavigatorAppBadge(total: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as BadgeNavigator;
  const badge = resolveNavigatorBadgeCount(total);
  if (badge > 0 && typeof nav.setAppBadge === "function") {
    void nav.setAppBadge(badge).catch(() => {
      /* unsupported or permission denied */
    });
    return;
  }
  if (typeof nav.clearAppBadge === "function") {
    void nav.clearAppBadge().catch(() => {
      /* ignore */
    });
  }
}

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { useAppBadgeTotal } from "@/hooks/use-unread-counters";
import { syncNavigatorAppBadge } from "@/lib/app-badge-sync";

/** P17-9-5 — OS app badge = messages + notifications. */
export function AppBadgeSync() {
  const { user, isLoading } = useAuth();
  const afterFirstPaint = useAfterFirstPaint();
  const enabled = afterFirstPaint && !!user && !isLoading;
  const total = useAppBadgeTotal({ enabled });

  useEffect(() => {
    if (!enabled) {
      syncNavigatorAppBadge(0);
      return;
    }
    syncNavigatorAppBadge(total);
  }, [enabled, total]);

  return null;
}

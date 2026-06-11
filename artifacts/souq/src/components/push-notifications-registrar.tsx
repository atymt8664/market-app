import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { getPushSupportState } from "@/lib/push-notifications";

/**
 * Keeps push badge + deep-link navigation in sync via service worker messages.
 * P17-9-13: sync Web Push subscription when OS permission already granted but DB has no row.
 */
export function PushNotificationsRegistrar() {
  const { user, isLoading } = useAuth();
  const afterFirstPaint = useAfterFirstPaint();
  const enabled = !!user && !isLoading && afterFirstPaint;
  const push = usePushNotifications(enabled);
  const prefs = useNotificationPreferences(enabled);
  const syncAttempted = useRef(false);

  useEffect(() => {
    if (!enabled || syncAttempted.current) return;
    if (push.isLoading || prefs.isLoading || push.status?.subscribed) return;
    if (push.status?.configured === false) return;
    if (prefs.prefs?.pushEnabled === false) return;
    if (getPushSupportState() !== "granted") return;

    syncAttempted.current = true;
    void (async () => {
      const result = await push.subscribe();
      if (result === "subscribed" && prefs.prefs?.pushEnabled !== true) {
        await prefs.saveSilent({ pushEnabled: true });
      }
    })();
  }, [
    enabled,
    prefs.isLoading,
    prefs.prefs?.pushEnabled,
    prefs.saveSilent,
    push.isLoading,
    push.status?.configured,
    push.status?.subscribed,
    push.subscribe,
  ]);

  return null;
}

import { useAuth } from "@/hooks/use-auth";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { useEffect } from "react";

/**
 * Registers Web Push when user is signed in (after first paint).
 * Keeps badge in sync via service worker postMessage.
 */
export function PushNotificationsRegistrar() {
  const { user, isLoading } = useAuth();
  const afterFirstPaint = useAfterFirstPaint();
  const enabled = !!user && !isLoading && afterFirstPaint;
  const { support, status, subscribe } = usePushNotifications(enabled);

  useEffect(() => {
    if (!enabled) return;
    if (support !== "default") return;
    if (status?.subscribed) return;

    scheduleAfterFirstPaint(() => {
      void subscribe();
    }, 4000);
  }, [enabled, status?.subscribed, subscribe, support]);

  return null;
}

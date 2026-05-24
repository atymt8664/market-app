import { useAuth } from "@/hooks/use-auth";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { usePushNotifications } from "@/hooks/use-push-notifications";

/**
 * Keeps push badge + deep-link navigation in sync via service worker messages.
 * Device opt-in is explicit on /account/notifications (no auto-subscribe).
 */
export function PushNotificationsRegistrar() {
  const { user, isLoading } = useAuth();
  const afterFirstPaint = useAfterFirstPaint();
  usePushNotifications(!!user && !isLoading && afterFirstPaint);
  return null;
}

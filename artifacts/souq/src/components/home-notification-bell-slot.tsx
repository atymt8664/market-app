import { lazy, Suspense } from "react";
import { useAfterFirstPaint } from "@/lib/after-first-paint";

/** P7-PR-8: defer notification bell chunk until after first paint. */
const NotificationBell = lazy(() =>
  import("@/components/notification-bell").then((m) => ({ default: m.NotificationBell })),
);

export function HomeNotificationBellSlot({ className }: { className?: string }) {
  const ready = useAfterFirstPaint();
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <NotificationBell className={className} />
    </Suspense>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  dismissPushPromptForCooldown,
  shouldOfferPushPermissionPrompt,
  writeNotificationPromptState,
} from "@/lib/push-permission-prompt";

const DIALOG_SURFACE =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] p-5 shadow-[0_0_32px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/20 sm:max-w-md";

const PROMPT_DELAY_MS = 1800;

function isExcludedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account/notifications") ||
    pathname.startsWith("/guest-welcome")
  );
}

/**
 * P17-9-13 — production permission flow: in-app primer → OS permission → push subscription → DB.
 */
export function NotificationPermissionPrompt() {
  const { user, isLoading: authLoading } = useAuth();
  const afterFirstPaint = useAfterFirstPaint();
  const [pathname] = useLocation();
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const { toast } = useToast();

  const userId = user?.id;
  const enabled =
    !!userId && !authLoading && afterFirstPaint && !isExcludedRoute(pathname);
  const push = usePushNotifications(enabled);
  const prefs = useNotificationPreferences(enabled);

  const [open, setOpen] = useState(false);
  const [deniedOpen, setDeniedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const scheduled = useRef(false);

  useEffect(() => {
    if (!enabled || scheduled.current) return;
    if (push.isLoading || prefs.isLoading || push.status?.configured === false) return;
    if (!userId) return;
    if (!shouldOfferPushPermissionPrompt(userId, push.support, push.status?.subscribed)) return;

    scheduled.current = true;
    const timer = window.setTimeout(() => {
      if (shouldOfferPushPermissionPrompt(userId, push.support, push.status?.subscribed)) {
        setOpen(true);
      }
    }, PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    prefs.isLoading,
    push.isLoading,
    push.status?.configured,
    push.status?.subscribed,
    push.support,
    userId,
  ]);

  const closePrimer = useCallback((next: boolean) => {
    if (busy) return;
    setOpen(next);
  }, [busy]);

  const handleNotNow = useCallback(() => {
    if (userId) dismissPushPromptForCooldown(userId);
    setOpen(false);
  }, [userId]);

  const handleEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await push.subscribe();
      if (result === "subscribed") {
        if (userId) writeNotificationPromptState(userId, "granted");
        await prefs.saveSilent({ pushEnabled: true });
        setOpen(false);
        toast({ title: t("p17.notifications.permission_enabled_toast") });
        return;
      }
      if (result === "denied") {
        if (userId) writeNotificationPromptState(userId, "denied");
        setOpen(false);
        setDeniedOpen(true);
        return;
      }
      if (result === "not-configured") {
        toast({
          title: t("account_notifications.push_not_configured"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("account_notifications.device_enable_error"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, prefs, push, toast, userId]);

  if (!enabled) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={closePrimer}>
        <DialogContent
          dir={isRtl ? "rtl" : "ltr"}
          className={cn(DIALOG_SURFACE, "text-right")}
          data-testid="notification-permission-prompt"
        >
          <DialogHeader className="space-y-3 text-right sm:text-right">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary sm:mx-0">
              <Bell className="h-7 w-7" aria-hidden />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {t("p17.notifications.permission_title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t("p17.notifications.permission_body")}
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-2 space-y-2 text-sm text-zinc-300">
            <li>{t("p17.notifications.permission_bullet_messages")}</li>
            <li>{t("p17.notifications.permission_bullet_reports")}</li>
            <li>{t("p17.notifications.permission_bullet_orders")}</li>
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void handleEnable()}
              data-testid="notification-permission-enable"
            >
              {busy ? t("account_notifications.device_working") : t("p17.notifications.permission_enable")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-zinc-400"
              disabled={busy}
              onClick={handleNotNow}
              data-testid="notification-permission-not-now"
            >
              {t("p17.notifications.permission_not_now")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deniedOpen} onOpenChange={setDeniedOpen}>
        <AlertDialogContent
          dir={isRtl ? "rtl" : "ltr"}
          className={cn(DIALOG_SURFACE, "text-right")}
          data-testid="notification-permission-denied"
        >
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{t("p17.notifications.permission_denied_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t("p17.notifications.permission_denied_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setDeniedOpen(false)}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {t("p17.notifications.permission_denied_dismiss")}
            </Button>
            <AlertDialogCancel className="w-full border-0 bg-transparent text-zinc-400 hover:bg-primary/5">
              {t("p17.notifications.permission_not_now")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

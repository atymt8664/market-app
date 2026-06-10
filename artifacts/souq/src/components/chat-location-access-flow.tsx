import { useCallback, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
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
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  isChatGpsServiceUnavailable,
  requestChatCurrentPosition,
  type ChatGeolocationErrorKind,
  type ChatLocationCoords,
} from "@/lib/chat-geolocation";

const DIALOG_SURFACE =
  "rounded-2xl border border-primary/35 bg-[#0A0D12] p-5 shadow-[0_0_32px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/20 sm:max-w-md";

/** Wait for Radix dialog overlay to unmount so OS geolocation prompt is not blocked. */
const DIALOG_UNMOUNT_MS = 250;

function waitForDialogUnmount(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, DIALOG_UNMOUNT_MS);
  });
}

type ChatLocationAccessFlowProps = {
  permissionOpen: boolean;
  onPermissionOpenChange: (open: boolean) => void;
  onLocationGranted: (coords: ChatLocationCoords) => void;
  dirRtl: boolean;
  disabled?: boolean;
};

export function ChatLocationAccessFlow({
  permissionOpen,
  onPermissionOpenChange,
  onLocationGranted,
  dirRtl,
  disabled,
}: ChatLocationAccessFlowProps) {
  const [gpsOffOpen, setGpsOffOpen] = useState(false);
  const [gpsErrorKind, setGpsErrorKind] = useState<ChatGeolocationErrorKind | null>(null);
  const [permissionDeniedOpen, setPermissionDeniedOpen] = useState(false);
  const [settingsHintOpen, setSettingsHintOpen] = useState(false);
  const [awaitingSystem, setAwaitingSystem] = useState(false);

  const resetFlow = useCallback(() => {
    setAwaitingSystem(false);
    setGpsErrorKind(null);
  }, []);

  const closePermission = useCallback(
    (open: boolean) => {
      if (awaitingSystem) return;
      if (!open) resetFlow();
      onPermissionOpenChange(open);
    },
    [awaitingSystem, onPermissionOpenChange, resetFlow],
  );

  const handleGeolocationResult = useCallback(
    (result: Awaited<ReturnType<typeof requestChatCurrentPosition>>) => {
      setAwaitingSystem(false);

      if (result.ok) {
        onPermissionOpenChange(false);
        setGpsOffOpen(false);
        setPermissionDeniedOpen(false);
        resetFlow();
        onLocationGranted({
          lat: result.lat,
          lng: result.lng,
          accuracyMeters: result.accuracyMeters,
        });
        return;
      }

      if (result.kind === "permission_denied") {
        setPermissionDeniedOpen(true);
        return;
      }

      if (isChatGpsServiceUnavailable(result.kind)) {
        setGpsErrorKind(result.kind);
        setGpsOffOpen(true);
        return;
      }

      setGpsErrorKind(result.kind);
      setGpsOffOpen(true);
    },
    [onLocationGranted, onPermissionOpenChange, resetFlow],
  );

  /** Calls real OS/browser geolocation — only after app permission dialog is closed. */
  const invokeSystemGeolocation = useCallback(async () => {
    setAwaitingSystem(true);
    await waitForDialogUnmount();
    const result = await requestChatCurrentPosition();
    handleGeolocationResult(result);
  }, [handleGeolocationResult]);

  const onContinue = () => {
    if (disabled || awaitingSystem) return;
    onPermissionOpenChange(false);
    void invokeSystemGeolocation();
  };

  const onDeniedRetry = () => {
    if (awaitingSystem) return;
    setPermissionDeniedOpen(false);
    void invokeSystemGeolocation();
  };

  const onGpsRetry = () => {
    if (awaitingSystem) return;
    setGpsOffOpen(false);
    setGpsErrorKind(null);
    void invokeSystemGeolocation();
  };

  const onGpsOffOpenChange = (open: boolean) => {
    if (awaitingSystem) return;
    setGpsOffOpen(open);
    if (!open) resetFlow();
  };

  const onDeniedOpenChange = (open: boolean) => {
    if (awaitingSystem) return;
    setPermissionDeniedOpen(open);
    if (!open) resetFlow();
  };

  const gpsBodyKey =
    gpsErrorKind === "timeout"
      ? "message_thread.location_gps_timeout"
      : "message_thread.location_gps_disabled_body";

  return (
    <>
      <Dialog open={permissionOpen} onOpenChange={closePermission}>
        <DialogContent
          hideClose
          dir={dirRtl ? "rtl" : "ltr"}
          data-testid="chat-location-permission-dialog"
          className={cn(
            DIALOG_SURFACE,
            "gap-0 border-primary/40 p-0",
            dirRtl ? "text-right" : "text-left",
          )}
        >
          <DialogHeader
            className={cn(
              "space-y-3 border-b border-primary/20 px-5 pb-4 pt-5",
              dirRtl ? "text-right" : "text-start",
            )}
          >
            <div
              className={cn(
                "flex items-start gap-3",
                dirRtl ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_18px_-8px_hsl(var(--primary)/0.45)]"
                aria-hidden
              >
                <MapPin className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <DialogTitle className="text-base font-bold leading-snug text-white">
                  {t("message_thread.location_permission_title")}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-zinc-400">
                  {t("message_thread.location_permission_body")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div
            className={cn(
              "flex flex-wrap gap-2.5 px-5 pb-5 pt-4",
              dirRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              disabled={disabled || awaitingSystem}
              data-testid="chat-location-permission-continue"
              onClick={onContinue}
              className={cn(
                "inline-flex h-11 min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/50 bg-primary/15 px-4 text-sm font-semibold text-primary",
                "shadow-[0_0_20px_-10px_hsl(var(--primary)/0.55)] ring-1 ring-primary/25 transition-colors hover:border-primary/70 hover:bg-primary/22 disabled:pointer-events-none disabled:opacity-45 sm:flex-none",
              )}
            >
              {t("message_thread.location_permission_continue")}
            </button>
            <button
              type="button"
              disabled={awaitingSystem}
              data-testid="chat-location-permission-dismiss"
              onClick={() => closePermission(false)}
              className={cn(
                "inline-flex h-11 min-w-[7.5rem] flex-1 items-center justify-center rounded-2xl border border-primary/30 bg-zinc-950/90 px-4 text-sm font-semibold text-zinc-200",
                "transition-colors hover:border-primary/45 hover:bg-zinc-900 disabled:pointer-events-none disabled:opacity-45 sm:flex-none",
              )}
            >
              {t("message_thread.location_permission_not_now")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={permissionDeniedOpen} onOpenChange={onDeniedOpenChange}>
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          data-testid="chat-location-permission-denied-dialog"
          className={cn(DIALOG_SURFACE, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}>
            <AlertDialogTitle className="text-base font-bold text-white">
              {t("message_thread.location_gps_denied_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t("message_thread.location_gps_denied")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              disabled={awaitingSystem}
              data-testid="chat-location-open-settings"
              onClick={() => setSettingsHintOpen(true)}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/50 bg-primary/15 px-4 text-sm font-semibold text-primary",
                dirRtl && "flex-row-reverse",
              )}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {t("message_thread.location_gps_open_settings")}
            </button>
            <div className={cn("flex flex-wrap gap-2.5", dirRtl ? "flex-row-reverse" : "flex-row")}>
              <button
                type="button"
                disabled={awaitingSystem}
                data-testid="chat-location-denied-retry"
                onClick={onDeniedRetry}
                className="inline-flex h-11 min-w-[7.5rem] flex-1 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/90 px-4 text-sm font-semibold text-zinc-200 sm:flex-none"
              >
                {t("message_thread.location_gps_retry")}
              </button>
              <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-2xl border border-primary/30 bg-zinc-950/90 text-sm font-semibold text-zinc-200 sm:flex-none">
                {t("message_thread.location_gps_cancel")}
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={settingsHintOpen} onOpenChange={setSettingsHintOpen}>
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          data-testid="chat-location-settings-hint-dialog"
          className={cn(DIALOG_SURFACE, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}>
            <AlertDialogTitle className="text-base font-bold text-white">
              {t("message_thread.location_gps_settings_hint_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t("message_thread.location_gps_settings_hint_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel className="mt-2 h-11 w-full rounded-2xl border border-primary/30 bg-zinc-950/90 text-sm font-semibold text-zinc-200">
            {t("message_thread.location_gps_cancel")}
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={gpsOffOpen} onOpenChange={onGpsOffOpenChange}>
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          data-testid="chat-location-gps-off-dialog"
          className={cn(DIALOG_SURFACE, dirRtl ? "text-right" : "text-left")}
        >
          <AlertDialogHeader className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}>
            <AlertDialogTitle className="text-base font-bold text-white">
              {t("message_thread.location_gps_disabled_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t(gpsBodyKey)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className={cn("flex flex-wrap gap-2.5 pt-2", dirRtl ? "flex-row-reverse" : "flex-row")}>
            <button
              type="button"
              disabled={awaitingSystem}
              data-testid="chat-location-gps-retry"
              onClick={onGpsRetry}
              className="inline-flex h-11 min-w-[7.5rem] flex-1 items-center justify-center rounded-2xl border border-primary/50 bg-primary/15 px-4 text-sm font-semibold text-primary sm:flex-none"
            >
              {t("message_thread.location_gps_retry")}
            </button>
            <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-2xl border border-primary/30 bg-zinc-950/90 text-sm font-semibold text-zinc-200 sm:flex-none">
              {t("message_thread.location_gps_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

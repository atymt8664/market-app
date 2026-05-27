import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChatLocationMapPicker,
  type ChatLocationMapFlyTarget,
} from "@/components/chat-location-map-picker";
import {
  canSendChatCurrentLocation,
  chatLocationAccuracyToZoom,
  openDeviceLocationRecovery,
  startChatLocationTracking,
  type ChatGeolocationError,
  type ChatWatchController,
} from "@/lib/chat-geolocation";
import { DEFAULT_SEARCH_MAP_CENTER } from "@/lib/search-location";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const FLOW_HISTORY_MARKER = 3;

type FlowStep = "intro" | "map";

type ChatLocationShareFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirRtl: boolean;
  sending?: boolean;
  onSendLocation: (lat: number, lng: number) => void;
};

const sheetShell =
  "flex max-h-[min(92dvh,780px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.72)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg";

const alertSurface =
  "rounded-2xl border border-primary/35 bg-zinc-950/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

const sendListRow =
  "flex w-full items-center gap-3 rounded-2xl border border-primary/35 bg-zinc-950/88 px-4 py-3.5 text-start shadow-[0_0_18px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-[border-color,background-color,transform] hover:border-primary/50 hover:bg-zinc-900/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45";

const iconWrap =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-zinc-900 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.28)]";

export function ChatLocationShareFlow({
  open,
  onOpenChange,
  dirRtl,
  sending = false,
  onSendLocation,
}: ChatLocationShareFlowProps) {
  const [step, setStep] = useState<FlowStep>("intro");
  const [draftLat, setDraftLat] = useState<number>(DEFAULT_SEARCH_MAP_CENTER.lat);
  const [draftLng, setDraftLng] = useState<number>(DEFAULT_SEARCH_MAP_CENTER.lng);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [flyTo, setFlyTo] = useState<ChatLocationMapFlyTarget | null>(null);
  const [userAdjusted, setUserAdjusted] = useState(false);

  const userAdjustedRef = useRef(false);
  const flyTokenRef = useRef(0);
  const openRef = useRef(open);
  const watchRef = useRef<ChatWatchController | null>(null);
  const accuracyRef = useRef<number | null>(null);
  openRef.current = open;

  const stopWatch = useCallback(() => {
    watchRef.current?.stop();
    watchRef.current = null;
  }, []);

  const resetMapState = useCallback(() => {
    stopWatch();
    userAdjustedRef.current = false;
    flyTokenRef.current = 0;
    accuracyRef.current = null;
    setDraftLat(DEFAULT_SEARCH_MAP_CENTER.lat);
    setDraftLng(DEFAULT_SEARCH_MAP_CENTER.lng);
    setAccuracyMeters(null);
    setFlyTo(null);
    setUserAdjusted(false);
  }, [stopWatch]);

  useEffect(() => {
    if (!open) {
      stopWatch();
      return;
    }
    setStep("intro");
    resetMapState();
  }, [open, resetMapState, stopWatch]);

  const flyMapTo = useCallback((lat: number, lng: number, accuracy: number | null) => {
    const zoom = chatLocationAccuracyToZoom(accuracy);
    flyTokenRef.current += 1;
    setFlyTo({
      lat,
      lng,
      zoom,
      token: flyTokenRef.current,
    });
  }, []);

  const applyPositionUpdate = useCallback(
    (lat: number, lng: number, accuracy: number | null, isPreview?: boolean) => {
      if (!openRef.current || userAdjustedRef.current) return;

      setDraftLat(lat);
      setDraftLng(lng);
      flyMapTo(lat, lng, accuracy);

      if (isPreview) return;

      accuracyRef.current = accuracy;
      setAccuracyMeters(accuracy);
    },
    [flyMapTo],
  );

  const handleWatchError = useCallback((error: ChatGeolocationError) => {
    if (!openRef.current || userAdjustedRef.current) return;
    if (error === "timeout" || error === "unsupported" || error === "insecure") return;
    openDeviceLocationRecovery(error);
  }, []);

  const startTracking = useCallback(() => {
    if (!openRef.current || userAdjustedRef.current) return;
    stopWatch();

    const controller = startChatLocationTracking(
      (update) =>
        applyPositionUpdate(update.lat, update.lng, update.accuracyMeters, update.isPreview),
      handleWatchError,
    );
    watchRef.current = controller;
  }, [applyPositionUpdate, handleWatchError, stopWatch]);

  useEffect(() => {
    if (!open || step !== "map") return;
    startTracking();
    return () => stopWatch();
  }, [open, step, startTracking, stopWatch]);

  useEffect(() => {
    if (!open || step !== "map") return;

    const resumeAfterSettings = () => {
      if (document.visibilityState !== "visible" || !openRef.current) return;
      if (userAdjustedRef.current) return;
      startTracking();
    };

    document.addEventListener("visibilitychange", resumeAfterSettings);
    window.addEventListener("focus", resumeAfterSettings);
    window.addEventListener("pageshow", resumeAfterSettings);
    return () => {
      document.removeEventListener("visibilitychange", resumeAfterSettings);
      window.removeEventListener("focus", resumeAfterSettings);
      window.removeEventListener("pageshow", resumeAfterSettings);
    };
  }, [open, step, startTracking]);

  const onIntroContinue = useCallback(() => {
    setStep("map");
  }, []);

  const onIntroDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const onMapCenterChange = useCallback((lat: number, lng: number) => {
    setDraftLat(lat);
    setDraftLng(lng);
  }, []);

  const onUserAdjust = useCallback(() => {
    stopWatch();
    userAdjustedRef.current = true;
    setUserAdjusted(true);
    accuracyRef.current = null;
    setAccuracyMeters(null);
  }, [stopWatch]);

  const sendPickedLocation = useCallback(() => {
    stopWatch();
    onSendLocation(draftLat, draftLng);
    onOpenChange(false);
  }, [draftLat, draftLng, onOpenChange, onSendLocation, stopWatch]);

  useEffect(() => {
    if (!open || step !== "map") return;

    history.pushState({ souqChatLocationShare: FLOW_HISTORY_MARKER }, "", window.location.href);

    const onPopState = () => {
      if (!openRef.current) return;
      scrollPopstateGuard.skipNext = true;
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", onPopState, { capture: true });
      const state = history.state as { souqChatLocationShare?: unknown } | null;
      if (state?.souqChatLocationShare === FLOW_HISTORY_MARKER) {
        scrollPopstateGuard.skipNext = true;
        history.back();
      }
    };
  }, [open, step, onOpenChange]);

  const sheetTitle = t("message_thread.location_share_sheet_title");
  const canSendCurrent = userAdjusted || canSendChatCurrentLocation(accuracyMeters);
  const showLocatingOverlay = !userAdjusted && !canSendChatCurrentLocation(accuracyMeters);

  return (
    <>
      <AlertDialog
        open={open && step === "intro"}
        onOpenChange={(next) => {
          if (!next) onIntroDismiss();
        }}
      >
        <AlertDialogContent
          dir={dirRtl ? "rtl" : "ltr"}
          className={cn(alertSurface, dirRtl ? "text-right" : "text-start")}
          data-testid="chat-location-intro-dialog"
        >
          <AlertDialogHeader className={cn("space-y-2", dirRtl ? "text-right" : "text-start")}>
            <AlertDialogTitle className="text-lg font-bold text-white">
              {t("message_thread.location_share_sheet_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-400">
              {t("message_thread.location_share_intro_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end",
              dirRtl && "sm:flex-row-reverse",
            )}
          >
            <AlertDialogCancel
              className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/90 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
              data-testid="chat-location-intro-not-now"
            >
              {t("message_thread.location_share_intro_not_now")}
            </AlertDialogCancel>
            <button
              type="button"
              onClick={onIntroContinue}
              className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-2xl border border-primary/50 bg-primary/15 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)] hover:bg-primary/22"
              data-testid="chat-location-intro-continue"
            >
              {t("message_thread.location_share_intro_continue")}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open && step === "map"} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideClose
          className={sheetShell}
          data-testid="chat-location-map-sheet"
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4"
            dir={dirRtl ? "rtl" : "ltr"}
          >
            <span className="h-9 w-9 shrink-0" aria-hidden />
            <SheetTitle className="m-0 flex-1 text-center text-base font-semibold text-white">
              {sheetTitle}
            </SheetTitle>
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t("message_thread.location_share_cancel")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-zinc-950/90 text-primary transition-colors hover:border-primary/65 hover:bg-zinc-900"
              >
                ✕
              </button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>

          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            dir={dirRtl ? "rtl" : "ltr"}
          >
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-primary/35 ring-1 ring-primary/15">
              <ChatLocationMapPicker
                lat={draftLat}
                lng={draftLng}
                flyTo={flyTo}
                onCenterChange={onMapCenterChange}
                onUserAdjust={onUserAdjust}
                active={open && step === "map"}
                className="h-[min(46dvh,340px)]"
              />
              {showLocatingOverlay ? (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[550] bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5"
                  role="status"
                  aria-live="polite"
                  data-testid="chat-location-locating-overlay"
                >
                  <p
                    className={cn(
                      "flex items-center gap-2 text-[12px] font-medium text-primary",
                      dirRtl ? "flex-row-reverse justify-end" : "justify-start",
                    )}
                    data-testid="chat-location-locating-message"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("message_thread.location_share_locating_title")}
                  </p>
                </div>
              ) : null}
            </div>

            {canSendCurrent ? (
              <button
                type="button"
                disabled={sending}
                className={sendListRow}
                onClick={sendPickedLocation}
                data-testid="chat-location-send-current-row"
              >
                <span className={iconWrap} aria-hidden>
                  <MapPin className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-sm font-semibold text-white"
                    data-testid="chat-location-send-title"
                  >
                    {userAdjusted
                      ? t("message_thread.location_share_send_selected")
                      : t("message_thread.location_share_send_current")}
                  </span>
                  {!userAdjusted && accuracyMeters != null ? (
                    <span
                      className="mt-0.5 block text-[12px] text-zinc-400"
                      data-testid="chat-location-send-subtitle"
                    >
                      {t("message_thread.location_share_accuracy_reaches", {
                        meters: accuracyMeters,
                      })}
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

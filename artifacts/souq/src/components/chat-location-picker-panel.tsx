import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Navigation, Radio } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatLocationPickerMap } from "@/components/chat-location-picker-map";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import type { ChatLocationCoords } from "@/lib/chat-geolocation";
import {
  fetchChatNearbyPlaces,
  reverseGeocodeChatLocation,
  type ChatLocationPlace,
} from "@/components/chat-location-nominatim";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const PICKER_HISTORY_MARKER = 3;

const sheetShell =
  "z-[60] flex h-[min(100dvh,920px)] max-h-[100dvh] w-full flex-col border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.72)] ring-1 ring-primary/14 sm:max-h-[92dvh] sm:rounded-t-2xl";

const rowBtn =
  "flex w-full items-start gap-3 rounded-2xl border border-primary/28 bg-zinc-950/85 px-4 py-3.5 text-right shadow-[0_0_16px_-12px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 transition-[border-color,background-color] hover:border-primary/45 hover:bg-zinc-900/90 active:scale-[0.995] disabled:pointer-events-none disabled:opacity-45";

const iconWrap =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary";

export type ChatLocationPickerPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirRtl: boolean;
  initial: ChatLocationCoords | null;
  sending?: boolean;
  onSendLocation: (lat: number, lng: number) => void;
};

export function ChatLocationPickerPanel({
  open,
  onOpenChange,
  dirRtl,
  initial,
  sending,
  onSendLocation,
}: ChatLocationPickerPanelProps) {
  const [draftLat, setDraftLat] = useState(initial?.lat ?? 0);
  const [draftLng, setDraftLng] = useState(initial?.lng ?? 0);
  const [accuracyMeters, setAccuracyMeters] = useState(initial?.accuracyMeters ?? 0);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [nearby, setNearby] = useState<ChatLocationPlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  useEffect(() => {
    if (!open || !initial) return;
    setDraftLat(initial.lat);
    setDraftLng(initial.lng);
    setAccuracyMeters(initial.accuracyMeters);
    setCurrentLabel(null);
    setNearby([]);
    setLoadingPlaces(true);

    let cancelled = false;
    void (async () => {
      const [label, places] = await Promise.all([
        reverseGeocodeChatLocation(initial.lat, initial.lng),
        fetchChatNearbyPlaces(initial.lat, initial.lng),
      ]);
      if (cancelled) return;
      setCurrentLabel(label);
      setNearby(places);
      setLoadingPlaces(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, initial]);

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open) return;

    history.pushState({ souqChatLocationPicker: PICKER_HISTORY_MARKER }, "", window.location.href);

    const onPopState = () => {
      if (!openRef.current) return;
      scrollPopstateGuard.skipNext = true;
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", onPopState, { capture: true });
      const state = history.state as { souqChatLocationPicker?: unknown } | null;
      if (state?.souqChatLocationPicker === PICKER_HISTORY_MARKER) {
        scrollPopstateGuard.skipNext = true;
        history.back();
      }
    };
  }, [open, onOpenChange]);

  const onMapCenterChange = useCallback((lat: number, lng: number) => {
    setDraftLat(lat);
    setDraftLng(lng);
  }, []);

  const selectPlace = useCallback((place: ChatLocationPlace) => {
    setDraftLat(place.lat);
    setDraftLng(place.lng);
  }, []);

  const sendCurrent = () => {
    if (sending) return;
    onSendLocation(draftLat, draftLng);
  };

  const BackIcon = dirRtl ? ArrowRight : ArrowLeft;
  const accuracyLabel =
    accuracyMeters > 0 && Number.isFinite(accuracyMeters)
      ? t("message_thread.location_picker_accuracy", {
          meters: Math.max(1, Math.round(accuracyMeters)),
        })
      : null;

  if (!open || !initial) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        dir={dirRtl ? "rtl" : "ltr"}
        data-testid="chat-location-picker-panel"
        className={sheetShell}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b border-primary/25 px-3 py-3 sm:px-4">
          <div className={cn("flex items-center gap-2", dirRtl ? "flex-row-reverse" : "flex-row")}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-card/90 text-primary"
              aria-label={t("message_thread.location_picker_close")}
            >
              <BackIcon className="h-5 w-5" />
            </button>
            <SheetTitle className="min-w-0 flex-1 text-base font-bold text-white">
              {t("message_thread.location_picker_title")}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
          <ChatLocationPickerMap
            lat={draftLat}
            lng={draftLng}
            sheetOpen={open}
            onCenterChange={onMapCenterChange}
            className="h-[11rem] w-full shrink-0"
          />

          {accuracyLabel ? (
            <p className="text-center text-[11px] font-medium text-zinc-400">{accuracyLabel}</p>
          ) : null}

          <button
            type="button"
            disabled={sending}
            data-testid="chat-location-send-current"
            onClick={sendCurrent}
            className={cn(rowBtn, dirRtl ? "flex-row-reverse text-right" : "flex-row text-start")}
          >
            <span className={iconWrap} aria-hidden>
              <Navigation className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">
                {t("message_thread.location_picker_send_current")}
              </span>
              {currentLabel ? (
                <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{currentLabel}</span>
              ) : loadingPlaces ? (
                <span className="mt-0.5 block text-xs text-zinc-500">{t("message_thread.location_picker_loading")}</span>
              ) : null}
            </span>
          </button>

          <button
            type="button"
            disabled
            data-testid="chat-location-live-disabled"
            className={cn(
              rowBtn,
              "opacity-55",
              dirRtl ? "flex-row-reverse text-right" : "flex-row text-start",
            )}
          >
            <span className={iconWrap} aria-hidden>
              <Radio className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">
                {t("message_thread.location_picker_live")}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {t("message_thread.location_picker_live_soon")}
              </span>
            </span>
          </button>

          <div className="pt-1">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("message_thread.location_picker_nearby")}
            </p>
            {loadingPlaces ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("message_thread.location_picker_loading")}
              </div>
            ) : nearby.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500">
                {t("message_thread.location_picker_nearby_empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {nearby.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      disabled={sending}
                      data-testid="chat-location-nearby-place"
                      onClick={() => selectPlace(place)}
                      className={cn(rowBtn, dirRtl ? "flex-row-reverse text-right" : "flex-row text-start")}
                    >
                      <span className={iconWrap} aria-hidden>
                        <MapPin className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white">{place.label}</span>
                        {place.subtitle ? (
                          <span className="mt-0.5 block text-xs text-zinc-400">{place.subtitle}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {sending ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("message_thread.location_picker_sending")}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

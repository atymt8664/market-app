import { getGeolocationContextIssue } from "@/lib/search-location";

export type ChatGeolocationError =
  | "insecure"
  | "unsupported"
  | "denied"
  | "timeout"
  | "unavailable";

export type ChatPositionUpdate = {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  /** Cached / fast fix — map preview only, never unlocks send. */
  isPreview?: boolean;
};

export type ChatWatchController = {
  stop: () => void;
};

export {
  CHAT_LOCATION_ACCURACY_IMPROVING_M,
  CHAT_LOCATION_ACCURACY_NEAR_M,
  CHAT_LOCATION_ACCURACY_PRECISE_M,
  chatLocationAccuracyToZoom,
} from "@/lib/chat-geolocation-gate";

/** Accept a recent cached fix for instant map centre (not for send). */
export const CHAT_LOCATION_RECENT_MAX_AGE_MS = 60_000;

const FAST_PREVIEW_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: CHAT_LOCATION_RECENT_MAX_AGE_MS,
  timeout: 3_000,
};

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
};

function mapPositionError(err: GeolocationPositionError): ChatGeolocationError {
  if (err.code === err.PERMISSION_DENIED) return "denied";
  if (err.code === err.TIMEOUT) return "timeout";
  return "unavailable";
}

function roundAccuracyMeters(accuracy: number): number | null {
  return Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : null;
}

function positionToUpdate(pos: GeolocationPosition, isPreview: boolean): ChatPositionUpdate {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyMeters: roundAccuracyMeters(pos.coords.accuracy),
    isPreview,
  };
}

/** Rough distance in metres — good enough for live map tracking. */
function positionDeltaMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldAcceptGpsReading(
  lat: number,
  lng: number,
  accuracyMeters: number | null,
  bestAccuracyMeters: number | null,
  lastLat: number | null,
  lastLng: number | null,
): boolean {
  if (bestAccuracyMeters == null) return true;
  if (accuracyMeters != null && accuracyMeters < bestAccuracyMeters) return true;
  if (
    accuracyMeters != null &&
    bestAccuracyMeters != null &&
    accuracyMeters <= bestAccuracyMeters &&
    lastLat != null &&
    lastLng != null &&
    positionDeltaMeters(lastLat, lastLng, lat, lng) >= 3
  ) {
    return true;
  }
  return false;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function detectAndroidBrowserPackage(): string | null {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return "com.sec.android.app.sbrowser";
  if (/EdgA/i.test(ua)) return "com.microsoft.emmx";
  if (/Firefox/i.test(ua)) return "org.mozilla.firefox";
  if (/Chrome/i.test(ua)) return "com.android.chrome";
  return null;
}

/** Opens Android system location (GPS) settings — no in-app copy. */
export function openAndroidLocationSourceSettings(): void {
  if (typeof window === "undefined" || !isAndroidDevice()) return;
  const intent = "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end";
  window.location.assign(intent);
}

/** Opens Android app/site permission screen when location permission is blocked. */
export function openAndroidLocationPermissionSettings(): void {
  if (typeof window === "undefined" || !isAndroidDevice()) return;
  const pkg = detectAndroidBrowserPackage();
  if (!pkg) {
    openAndroidLocationSourceSettings();
    return;
  }
  window.location.assign(
    `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=${pkg};end`,
  );
}

/** System settings only — no custom in-app UI. */
export function openDeviceLocationRecovery(error: ChatGeolocationError): void {
  if (error === "denied") {
    openAndroidLocationPermissionSettings();
    return;
  }
  if (error === "unavailable") {
    openAndroidLocationSourceSettings();
  }
}

function emitBestReading(
  pos: GeolocationPosition,
  isPreview: boolean,
  onUpdate: (update: ChatPositionUpdate) => void,
  state: {
    bestAccuracyMeters: number | null;
    lastLat: number | null;
    lastLng: number | null;
  },
): void {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracyMeters = roundAccuracyMeters(pos.coords.accuracy);

  if (
    !isPreview &&
    !shouldAcceptGpsReading(
      lat,
      lng,
      accuracyMeters,
      state.bestAccuracyMeters,
      state.lastLat,
      state.lastLng,
    )
  ) {
    return;
  }

  if (
    !isPreview &&
    accuracyMeters != null &&
    (state.bestAccuracyMeters == null || accuracyMeters < state.bestAccuracyMeters)
  ) {
    state.bestAccuracyMeters = accuracyMeters;
  }

  if (!isPreview) {
    state.lastLat = lat;
    state.lastLng = lng;
  }

  onUpdate(positionToUpdate(pos, isPreview));
}

/**
 * WhatsApp-like location session:
 * 1) Optional recent cached fix for instant map centre (preview only).
 * 2) High-accuracy getCurrentPosition + watchPosition — best reading, keeps refining.
 */
export function startChatLocationTracking(
  onUpdate: (update: ChatPositionUpdate) => void,
  onError: (error: ChatGeolocationError) => void,
): ChatWatchController | null {
  const contextIssue = getGeolocationContextIssue();
  if (contextIssue === "unsupported") {
    onError("unsupported");
    return null;
  }
  if (contextIssue === "insecure") {
    onError("insecure");
    return null;
  }

  let watchId: number | null = null;
  let stopped = false;
  const state = {
    bestAccuracyMeters: null as number | null,
    lastLat: null as number | null,
    lastLng: null as number | null,
  };

  const stop = () => {
    stopped = true;
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (stopped) return;
      emitBestReading(pos, true, onUpdate, state);
    },
    () => {
      /* Preview is best-effort. */
    },
    FAST_PREVIEW_OPTIONS,
  );

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (stopped) return;
      emitBestReading(pos, false, onUpdate, state);
    },
    () => {
      /* watchPosition continues. */
    },
    HIGH_ACCURACY_OPTIONS,
  );

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (stopped) return;
      emitBestReading(pos, false, onUpdate, state);
    },
    (err) => {
      if (stopped) return;
      onError(mapPositionError(err));
    },
    WATCH_OPTIONS,
  );

  return { stop };
}

/** @deprecated Use {@link startChatLocationTracking}. */
export function startChatPositionWatch(
  onUpdate: (update: ChatPositionUpdate) => void,
  onError: (error: ChatGeolocationError) => void,
): ChatWatchController | null {
  return startChatLocationTracking(onUpdate, onError);
}

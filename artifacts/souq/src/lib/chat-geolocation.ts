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
};

export type ChatWatchController = {
  stop: () => void;
};

/** Stop refining GPS once accuracy is at or below this threshold (metres). */
export const CHAT_LOCATION_ACCURACY_TARGET_M = 20;

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

function mapPositionError(err: GeolocationPositionError): ChatGeolocationError {
  if (err.code === err.PERMISSION_DENIED) return "denied";
  if (err.code === err.TIMEOUT) return "timeout";
  return "unavailable";
}

function roundAccuracyMeters(accuracy: number): number | null {
  return Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : null;
}

/** Map GPS accuracy (metres) to an appropriate street-level zoom. */
export function chatLocationAccuracyToZoom(accuracyMeters: number | null | undefined): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return 15;
  const acc = Math.max(5, accuracyMeters);
  if (acc <= 20) return 17;
  if (acc <= 50) return 16;
  if (acc <= 150) return 15;
  if (acc <= 500) return 14;
  if (acc <= 2000) return 13;
  return 12;
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
  const intent =
    "intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end";
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

export function openDeviceLocationRecovery(error: ChatGeolocationError): void {
  if (error === "denied") {
    openAndroidLocationPermissionSettings();
    return;
  }
  if (error === "unavailable" || error === "timeout") {
    openAndroidLocationSourceSettings();
  }
}

/**
 * Live GPS refinement for chat location share.
 * Stops automatically when accuracy ≤ CHAT_LOCATION_ACCURACY_TARGET_M.
 * Caller must invoke `stop()` when the sheet closes or the user picks manually.
 */
export function startChatPositionWatch(
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

  const stop = () => {
    stopped = true;
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (stopped) return;
      const accuracyMeters = roundAccuracyMeters(pos.coords.accuracy);
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters,
      });
      if (accuracyMeters != null && accuracyMeters <= CHAT_LOCATION_ACCURACY_TARGET_M) {
        stop();
      }
    },
    (err) => {
      if (stopped) return;
      onError(mapPositionError(err));
    },
    WATCH_OPTIONS,
  );

  return { stop };
}

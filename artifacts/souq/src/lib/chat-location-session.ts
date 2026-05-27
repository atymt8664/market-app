/**
 * P5 — chat location geolocation engine.
 * WhatsApp-like: high-accuracy GPS, best reading, background refinement.
 * Network-agnostic — Geolocation API and system permissions only.
 */

export type ChatLocationReading = {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
};

export type ChatLocationSession = {
  stop: () => void;
};

export type ChatLocationSessionError = "denied" | "unavailable";

export type ChatLocationPermissionStatus = "granted" | "prompt" | "denied" | "unknown";

/** Check whether geolocation is already allowed — skips intro when granted. */
export async function queryChatLocationPermission(): Promise<ChatLocationPermissionStatus> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "denied";

  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const result = await permissions.query({ name: "geolocation" });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    }
  } catch {
    /* Permissions API unavailable — fall through to intro. */
  }

  return "unknown";
}

const HIGH_ACCURACY: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30_000,
};

function roundMeters(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Street-level zoom from GPS accuracy (metres). */
export function chatLocationAccuracyToZoom(accuracyMeters: number | null | undefined): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return 14;
  const acc = Math.max(5, accuracyMeters);
  if (acc <= 20) return 18;
  if (acc <= 50) return 16;
  if (acc <= 150) return 15;
  return 14;
}

function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function androidBrowserPackage(): string | null {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return "com.sec.android.app.sbrowser";
  if (/EdgA/i.test(ua)) return "com.microsoft.emmx";
  if (/Firefox/i.test(ua)) return "org.mozilla.firefox";
  if (/Chrome/i.test(ua)) return "com.android.chrome";
  return null;
}

/** Opens Android system location settings — no in-app UI. */
export function openAndroidLocationSettings(): void {
  if (typeof window === "undefined" || !isAndroid()) return;
  window.location.assign("intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end");
}

function openAndroidAppPermissions(): void {
  if (typeof window === "undefined" || !isAndroid()) return;
  const pkg = androidBrowserPackage();
  if (!pkg) {
    openAndroidLocationSettings();
    return;
  }
  window.location.assign(
    `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;scheme=package;package=${pkg};end`,
  );
}

/** System recovery only — no custom dialogs. */
export function recoverChatLocationAccess(error: ChatLocationSessionError): void {
  if (error === "denied") openAndroidAppPermissions();
  else openAndroidLocationSettings();
}

type SessionState = {
  hasFix: boolean;
  bestAccuracyMeters: number | null;
  lastLat: number | null;
  lastLng: number | null;
};

function shouldAcceptReading(
  lat: number,
  lng: number,
  accuracyMeters: number | null,
  state: SessionState,
): boolean {
  if (!state.hasFix) return true;
  if (
    accuracyMeters != null &&
    state.bestAccuracyMeters != null &&
    accuracyMeters < state.bestAccuracyMeters
  ) {
    return true;
  }
  if (
    state.lastLat != null &&
    state.lastLng != null &&
    state.bestAccuracyMeters != null &&
    accuracyMeters != null &&
    accuracyMeters <= state.bestAccuracyMeters &&
    distanceMeters(state.lastLat, state.lastLng, lat, lng) >= 4
  ) {
    return true;
  }
  return false;
}

/**
 * Live GPS after system permission:
 * getCurrentPosition + watchPosition, enableHighAccuracy:true, best reading strategy.
 */
export function startChatLocationSession(
  onReading: (reading: ChatLocationReading) => void,
  onError: (error: ChatLocationSessionError) => void,
): ChatLocationSession | null {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError("unavailable");
    return null;
  }

  let watchId: number | null = null;
  let stopped = false;
  const state: SessionState = {
    hasFix: false,
    bestAccuracyMeters: null,
    lastLat: null,
    lastLng: null,
  };

  const stop = () => {
    stopped = true;
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  const handlePosition = (pos: GeolocationPosition) => {
    if (stopped) return;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracyMeters = roundMeters(pos.coords.accuracy);

    if (!shouldAcceptReading(lat, lng, accuracyMeters, state)) return;

    state.hasFix = true;
    state.lastLat = lat;
    state.lastLng = lng;

    if (
      accuracyMeters != null &&
      (state.bestAccuracyMeters == null || accuracyMeters < state.bestAccuracyMeters)
    ) {
      state.bestAccuracyMeters = accuracyMeters;
    }

    onReading({
      lat,
      lng,
      accuracyMeters: state.bestAccuracyMeters ?? accuracyMeters,
    });
  };

  const handleError = (err: GeolocationPositionError) => {
    if (stopped) return;
    if (err.code === err.PERMISSION_DENIED) onError("denied");
    else if (err.code === err.POSITION_UNAVAILABLE) onError("unavailable");
  };

  navigator.geolocation.getCurrentPosition(handlePosition, handleError, HIGH_ACCURACY);

  watchId = navigator.geolocation.watchPosition(handlePosition, handleError, HIGH_ACCURACY);

  return { stop };
}

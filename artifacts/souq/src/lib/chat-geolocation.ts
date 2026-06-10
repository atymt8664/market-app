import { getGeolocationContextIssue } from "@/lib/search-location";

const PRIMARY_TIMEOUT_MS = 20_000;
const RETRY_TIMEOUT_MS = 30_000;

/** Real browser geolocation options for chat current-location (not Live Location). */
export const CHAT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: PRIMARY_TIMEOUT_MS,
  maximumAge: 0,
};

export type ChatGeolocationErrorKind =
  | "unsupported"
  | "insecure"
  | "permission_denied"
  | "timeout"
  | "position_unavailable"
  | "unknown";

export type ChatGeolocationSuccess = {
  ok: true;
  lat: number;
  lng: number;
  accuracyMeters: number;
};

export type ChatGeolocationFailure = {
  ok: false;
  kind: ChatGeolocationErrorKind;
};

export type ChatGeolocationResult = ChatGeolocationSuccess | ChatGeolocationFailure;

function classifyGeolocationError(err: GeolocationPositionError): ChatGeolocationErrorKind {
  if (err.code === err.PERMISSION_DENIED) return "permission_denied";
  if (err.code === err.TIMEOUT) return "timeout";
  if (err.code === err.POSITION_UNAVAILABLE) return "position_unavailable";
  return "unknown";
}

function requestOnce(options: PositionOptions): Promise<ChatGeolocationResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        resolve({ ok: false, kind: classifyGeolocationError(err) });
      },
      options,
    );
  });
}

/**
 * Requests the device current position via the real Web Geolocation API.
 * Call only when no app modal overlay is visible — otherwise Android may block
 * the system permission sheet (precise/approximate / allow / deny).
 *
 * Retries once on timeout / position_unavailable (common after fresh Android grant + cold GPS).
 */
export async function requestChatCurrentPosition(): Promise<ChatGeolocationResult> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { ok: false, kind: "unsupported" };
  }
  if (!navigator.geolocation) {
    return { ok: false, kind: "unsupported" };
  }
  const contextIssue = getGeolocationContextIssue();
  if (contextIssue === "insecure") {
    return { ok: false, kind: "insecure" };
  }

  const first = await requestOnce(CHAT_GEOLOCATION_OPTIONS);
  if (first.ok || first.kind === "permission_denied") {
    return first;
  }

  if (first.kind === "timeout" || first.kind === "position_unavailable") {
    const retry = await requestOnce({
      enableHighAccuracy: true,
      timeout: RETRY_TIMEOUT_MS,
      maximumAge: 0,
    });
    return retry;
  }

  return first;
}

/** GPS/service unavailable — show dedicated retry dialog (not permission dialog). */
export function isChatGpsServiceUnavailable(kind: ChatGeolocationErrorKind): boolean {
  return kind === "position_unavailable" || kind === "timeout";
}

export type ChatLocationCoords = {
  lat: number;
  lng: number;
  accuracyMeters: number;
};

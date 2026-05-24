import { apiUrl } from "@/lib/api-url";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";

export type PushSupportState =
  | "unsupported"
  | "insecure"
  | "default"
  | "granted"
  | "denied";

export type PushStatusDto = {
  configured: boolean;
  subscribed: boolean;
  subscriptionCount: number;
};

function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "default";
}

export async function fetchPushVapidPublicKey(): Promise<string | null> {
  const res = await fetch(apiUrl("/api/push/vapid-public-key"), { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string };
  return typeof data.publicKey === "string" ? data.publicKey : null;
}

export async function fetchPushStatus(): Promise<PushStatusDto | null> {
  const res = await fetch(apiUrl("/api/push/status"), { credentials: "include" });
  if (!res.ok) return null;
  return res.json() as Promise<PushStatusDto>;
}

async function registerSubscriptionWithApi(subscription: PushSubscription): Promise<boolean> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof csrf === "string" && csrf.length >= 32) headers["X-CSRF-Token"] = csrf;

  const res = await fetch(apiUrl("/api/push/subscriptions"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });
  return res.ok;
}

export async function subscribeToPushNotifications(): Promise<
  "subscribed" | "denied" | "unsupported" | "not-configured" | "error"
> {
  const support = getPushSupportState();
  if (support === "unsupported" || support === "insecure") return "unsupported";

  const permission =
    support === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const publicKey = await fetchPushVapidPublicKey();
  if (!publicKey) return "not-configured";

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource,
    });
  }

  const ok = await registerSubscriptionWithApi(subscription);
  return ok ? "subscribed" : "error";
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof csrf === "string" && csrf.length >= 32) headers["X-CSRF-Token"] = csrf;

  await fetch(apiUrl("/api/push/subscriptions"), {
    method: "DELETE",
    credentials: "include",
    headers,
    body: JSON.stringify({ endpoint }),
  });

  await subscription.unsubscribe();
  return true;
}

export function installPushClientMessageHandler(
  onPushReceived: () => void,
  onNavigate: (path: string) => void,
): () => void {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    const data = event.data as { type?: string; url?: string; data?: { url?: string } } | null;
    if (!data?.type) return;
    if (data.type === "souq:push-received") onPushReceived();
    if (data.type === "souq:push-navigate") {
      const path = data.url ?? data.data?.url;
      if (typeof path === "string") onNavigate(path);
    }
    if (data.type === "souq:push-resubscribe") {
      void subscribeToPushNotifications();
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}

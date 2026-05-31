import { onCLS, onINP, onLCP, type Metric } from "web-vitals";
import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { apiUrl } from "@/lib/api-url";
import { normalizeVitalsRoute } from "@/lib/normalize-vitals-route";

const VITALS_IDLE_MS = 3000;

function vitalsEnabled(): boolean {
  const raw = import.meta.env.VITE_OBSERVABILITY_VITALS_ENABLED;
  if (raw === "0" || raw === "false") return false;
  return import.meta.env.PROD || raw === "1" || raw === "true";
}

function clientSampleRatePercent(): number {
  const raw = import.meta.env.VITE_OBSERVABILITY_VITALS_SAMPLE_RATE;
  if (raw === undefined || raw === "") {
    return import.meta.env.PROD ? 10 : 100;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return import.meta.env.PROD ? 10 : 100;
  return Math.min(100, Math.max(0, n));
}

function shouldSampleClient(): boolean {
  const rate = clientSampleRatePercent();
  if (rate >= 100) return true;
  if (rate <= 0) return false;
  return Math.random() * 100 < rate;
}

function sendVital(metric: Metric): void {
  if (!shouldSampleClient()) return;

  const payload = JSON.stringify({
    route: normalizeVitalsRoute(window.location.pathname),
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
  });

  const url = apiUrl("/api/observability/vitals");

  if (typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "omit",
  });
}

/** P13-3-B — first-party RUM; deferred until after first paint. */
export function initWebVitalsReporting(): void {
  if (typeof window === "undefined" || !vitalsEnabled()) return;

  scheduleAfterFirstPaint(() => {
    onLCP(sendVital);
    onINP(sendVital);
    onCLS(sendVital);
  }, VITALS_IDLE_MS);
}

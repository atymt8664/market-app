import { LatencyTracker } from "./latency-tracker";
import {
  rateWebVital,
  type WebVitalMetric,
  type WebVitalRating,
} from "./vitals-rating";

const MAX_ROUTE_LEN = 128;
const MAX_TRACKERS = 200;
const SAMPLE_SIZE = 2000;

type CounterMap = Record<string, number>;

const vitalsByRouteMetric = new Map<string, LatencyTracker>();
const ratingCounters: CounterMap = {};
let vitalsIngestTotal = 0;
let vitalsRejectedTotal = 0;

function routeMetricKey(route: string, metric: WebVitalMetric): string {
  return `${route}:${metric}`;
}

function inc(map: CounterMap, key: string, delta = 1): void {
  map[key] = (map[key] ?? 0) + delta;
}

/** Normalize client path to low-cardinality route patterns. */
export function normalizeVitalsRoute(raw: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let path = raw.trim().split("?")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path
    .replace(/\/\d+/g, "/:id")
    .replace(/\/[0-9a-f-]{36}/gi, "/:uuid");
  if (path.length > MAX_ROUTE_LEN) return null;
  return path;
}

export function isWebVitalMetric(value: string): value is WebVitalMetric {
  return value === "LCP" || value === "INP" || value === "CLS";
}

export type WebVitalIngestInput = {
  route: string;
  metric: WebVitalMetric;
  value: number;
  rating?: WebVitalRating;
};

export type WebVitalIngestResult =
  | { ok: true; rating: WebVitalRating }
  | { ok: false; reason: "invalid_route" | "invalid_metric" | "invalid_value" };

export function ingestWebVital(input: WebVitalIngestInput): WebVitalIngestResult {
  const route = normalizeVitalsRoute(input.route);
  if (!route) {
    vitalsRejectedTotal += 1;
    return { ok: false, reason: "invalid_route" };
  }
  if (!isWebVitalMetric(input.metric)) {
    vitalsRejectedTotal += 1;
    return { ok: false, reason: "invalid_metric" };
  }
  if (!Number.isFinite(input.value) || input.value < 0) {
    vitalsRejectedTotal += 1;
    return { ok: false, reason: "invalid_value" };
  }

  const rating = rateWebVital(input.metric, input.value);
  const key = routeMetricKey(route, input.metric);

  let tracker = vitalsByRouteMetric.get(key);
  if (!tracker) {
    if (vitalsByRouteMetric.size >= MAX_TRACKERS) {
      vitalsRejectedTotal += 1;
      return { ok: false, reason: "invalid_route" };
    }
    tracker = new LatencyTracker(SAMPLE_SIZE);
    vitalsByRouteMetric.set(key, tracker);
  }

  tracker.record(input.value);
  vitalsIngestTotal += 1;
  inc(ratingCounters, `${input.metric}:${rating}`);
  inc(ratingCounters, `route:${route}:${input.metric}:${rating}`);

  return { ok: true, rating };
}

export type WebVitalsSnapshot = {
  ingestTotal: number;
  rejectedTotal: number;
  byRouteMetric: Array<{
    route: string;
    metric: WebVitalMetric;
    count: number;
    p50Ms: number | null;
    p75Ms: number | null;
    p95Ms: number | null;
  }>;
  ratingCounts: CounterMap;
};

export function buildWebVitalsSnapshot(): WebVitalsSnapshot {
  const byRouteMetric: WebVitalsSnapshot["byRouteMetric"] = [];

  for (const [key, tracker] of vitalsByRouteMetric.entries()) {
    const sep = key.lastIndexOf(":");
    const route = key.slice(0, sep);
    const metric = key.slice(sep + 1) as WebVitalMetric;
    const snap = tracker.snapshot();
    byRouteMetric.push({
      route,
      metric,
      count: snap.count,
      p50Ms: snap.p50Ms,
      p75Ms: snap.p75Ms,
      p95Ms: snap.p95Ms,
    });
  }

  byRouteMetric.sort((a, b) => b.count - a.count);

  return {
    ingestTotal: vitalsIngestTotal,
    rejectedTotal: vitalsRejectedTotal,
    byRouteMetric: byRouteMetric.slice(0, 50),
    ratingCounts: { ...ratingCounters },
  };
}

/** Test-only reset. */
export function resetWebVitalsForTests(): void {
  vitalsByRouteMetric.clear();
  for (const key of Object.keys(ratingCounters)) delete ratingCounters[key];
  vitalsIngestTotal = 0;
  vitalsRejectedTotal = 0;
}

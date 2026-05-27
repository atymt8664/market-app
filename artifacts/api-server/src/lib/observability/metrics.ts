import { OBSERVABILITY } from "./config";
import { LatencyTracker, type LatencySummary } from "./latency-tracker";
import { recordWsConnectWindow, recordWsDisconnectWindow } from "./ws-window";

type CounterMap = Record<string, number>;

const httpByRoute = new Map<string, LatencyTracker>();
const httpGlobal = new LatencyTracker(OBSERVABILITY.latencySampleSize);
const dbGlobal = new LatencyTracker(OBSERVABILITY.latencySampleSize);
const searchGlobal = new LatencyTracker(OBSERVABILITY.latencySampleSize);

let httpRequestsTotal = 0;
let httpSlowTotal = 0;
let http5xxTotal = 0;
let dbQueriesTotal = 0;
let dbSlowTotal = 0;
let searchRequestsTotal = 0;
let searchSlowTotal = 0;
let searchEmptyTotal = 0;

let wsConnectionsCurrent = 0;
let wsConnectionsTotal = 0;
let wsDisconnectsTotal = 0;
let wsAuthFailuresTotal = 0;
let wsMessagesTotal = 0;

const httpStatusCounters: CounterMap = {};
const endpointCounters: CounterMap = {};

function routeKey(method: string, path: string): string {
  return `${method} ${path}`;
}

function inc(map: CounterMap, key: string, delta = 1): void {
  map[key] = (map[key] ?? 0) + delta;
}

export function recordHttpRequest(params: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}): void {
  const { method, path, statusCode, durationMs } = params;
  const key = routeKey(method, path);
  httpRequestsTotal += 1;
  inc(endpointCounters, key);
  inc(httpStatusCounters, String(Math.floor(statusCode / 100) * 100));
  httpGlobal.record(durationMs);
  let tracker = httpByRoute.get(key);
  if (!tracker) {
    tracker = new LatencyTracker(500);
    httpByRoute.set(key, tracker);
  }
  tracker.record(durationMs);
  if (durationMs >= OBSERVABILITY.slowHttpMs) httpSlowTotal += 1;
  if (statusCode >= 500) http5xxTotal += 1;
}

export function recordDbQuery(durationMs: number, label?: string): void {
  dbQueriesTotal += 1;
  dbGlobal.record(durationMs);
  if (durationMs >= OBSERVABILITY.slowDbMs) {
    dbSlowTotal += 1;
    if (label) inc(endpointCounters, `db.slow:${label}`);
  }
}

export function recordSearchRequest(params: {
  durationMs: number;
  resultCount: number;
  mode: "fts" | "ilike" | "none";
  queryLength: number;
}): void {
  searchRequestsTotal += 1;
  searchGlobal.record(params.durationMs);
  if (params.durationMs >= OBSERVABILITY.slowSearchMs) searchSlowTotal += 1;
  if (params.resultCount === 0 && params.queryLength > 0) searchEmptyTotal += 1;
  inc(endpointCounters, `search.mode:${params.mode}`);
}

export function recordWsConnect(): void {
  wsConnectionsTotal += 1;
  wsConnectionsCurrent += 1;
  recordWsConnectWindow();
}

export function recordWsDisconnect(): void {
  wsDisconnectsTotal += 1;
  wsConnectionsCurrent = Math.max(0, wsConnectionsCurrent - 1);
  recordWsDisconnectWindow();
}

export function recordWsAuthFailure(): void {
  wsAuthFailuresTotal += 1;
}

export function recordWsMessage(): void {
  wsMessagesTotal += 1;
}

let wsUsersGauge = 0;

export function syncWsUsersGauge(count: number): void {
  wsUsersGauge = Math.max(0, count);
}

export type ObservabilitySnapshot = {
  generatedAt: string;
  uptimeSeconds: number;
  process: {
    memoryRssMb: number;
    memoryHeapUsedMb: number;
    memoryHeapTotalMb: number;
  };
  http: {
    requestsTotal: number;
    slowTotal: number;
    errors5xxTotal: number;
    byStatusClass: CounterMap;
    latencyMs: LatencySummary;
    topRoutes: Array<{ route: string; count: number; latencyMs: LatencySummary }>;
  };
  database: {
    queriesTotal: number;
    slowTotal: number;
    latencyMs: LatencySummary;
  };
  search: {
    requestsTotal: number;
    slowTotal: number;
    emptyResultsTotal: number;
    latencyMs: LatencySummary;
  };
  websocket: {
    connectionsCurrent: number;
    connectionsTotal: number;
    disconnectsTotal: number;
    authFailuresTotal: number;
    messagesTotal: number;
    usersWithOpenSockets: number;
  };
  counters: CounterMap;
};

const processStartedAt = Date.now();

export function computeHttpErrorRate(requestsTotal: number, errors5xxTotal: number): number | null {
  if (requestsTotal <= 0) return null;
  return Math.round((errors5xxTotal / requestsTotal) * 10000) / 100;
}

export function buildSlowHttpEndpoints(limit = 10): Array<{
  route: string;
  count: number;
  latencyMs: LatencySummary;
}> {
  return [...httpByRoute.entries()]
    .map(([route, tracker]) => {
      const latencyMs = tracker.snapshot();
      return { route, count: latencyMs.count, latencyMs };
    })
    .filter(
      (entry) =>
        entry.latencyMs.p95Ms != null && entry.latencyMs.p95Ms >= OBSERVABILITY.slowHttpMs,
    )
    .sort((a, b) => (b.latencyMs.p95Ms ?? 0) - (a.latencyMs.p95Ms ?? 0))
    .slice(0, limit);
}

export function buildObservabilitySnapshot(): ObservabilitySnapshot {
  const mem = process.memoryUsage();
  const topRoutes = [...httpByRoute.entries()]
    .map(([route, tracker]) => ({
      route,
      count: tracker.snapshot().count,
      latencyMs: tracker.snapshot(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    process: {
      memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      memoryHeapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      memoryHeapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    http: {
      requestsTotal: httpRequestsTotal,
      slowTotal: httpSlowTotal,
      errors5xxTotal: http5xxTotal,
      byStatusClass: { ...httpStatusCounters },
      latencyMs: httpGlobal.snapshot(),
      topRoutes,
    },
    database: {
      queriesTotal: dbQueriesTotal,
      slowTotal: dbSlowTotal,
      latencyMs: dbGlobal.snapshot(),
    },
    search: {
      requestsTotal: searchRequestsTotal,
      slowTotal: searchSlowTotal,
      emptyResultsTotal: searchEmptyTotal,
      latencyMs: searchGlobal.snapshot(),
    },
    websocket: {
      connectionsCurrent: wsConnectionsCurrent,
      connectionsTotal: wsConnectionsTotal,
      disconnectsTotal: wsDisconnectsTotal,
      authFailuresTotal: wsAuthFailuresTotal,
      messagesTotal: wsMessagesTotal,
      usersWithOpenSockets: wsUsersGauge,
    },
    counters: { ...endpointCounters },
  };
}

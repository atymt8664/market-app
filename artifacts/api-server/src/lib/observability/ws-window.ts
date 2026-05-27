const WINDOW_MS = 60_000;

let connectTimestamps: number[] = [];
let disconnectTimestamps: number[] = [];

function prune(now: number): void {
  const cutoff = now - WINDOW_MS * 2;
  connectTimestamps = connectTimestamps.filter((t) => t >= cutoff);
  disconnectTimestamps = disconnectTimestamps.filter((t) => t >= cutoff);
}

export function recordWsConnectWindow(): void {
  const now = Date.now();
  connectTimestamps.push(now);
  prune(now);
}

export function recordWsDisconnectWindow(): void {
  const now = Date.now();
  disconnectTimestamps.push(now);
  prune(now);
}

export type WsWindowSnapshot = {
  windowSeconds: number;
  connectsLastMinute: number;
  disconnectsLastMinute: number;
  connectsPreviousMinute: number;
  disconnectsPreviousMinute: number;
  disconnectSpike: boolean;
  reconnectSpike: boolean;
};

export function snapshotWsWindow(): WsWindowSnapshot {
  const now = Date.now();
  const recentStart = now - WINDOW_MS;
  const prevStart = now - WINDOW_MS * 2;

  const connectsLastMinute = connectTimestamps.filter((t) => t >= recentStart).length;
  const disconnectsLastMinute = disconnectTimestamps.filter((t) => t >= recentStart).length;
  const connectsPreviousMinute = connectTimestamps.filter(
    (t) => t >= prevStart && t < recentStart,
  ).length;
  const disconnectsPreviousMinute = disconnectTimestamps.filter(
    (t) => t >= prevStart && t < recentStart,
  ).length;

  const disconnectSpike =
    disconnectsLastMinute >= 5 &&
    disconnectsLastMinute > Math.max(disconnectsPreviousMinute * 1.5, 3);
  const reconnectSpike =
    connectsLastMinute >= 5 && connectsLastMinute > Math.max(connectsPreviousMinute * 1.5, 3);

  return {
    windowSeconds: WINDOW_MS / 1000,
    connectsLastMinute,
    disconnectsLastMinute,
    connectsPreviousMinute,
    disconnectsPreviousMinute,
    disconnectSpike,
    reconnectSpike,
  };
}

export type LatencySummary = {
  count: number;
  minMs: number | null;
  maxMs: number | null;
  avgMs: number | null;
  p50Ms: number | null;
  p75Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
};

export class LatencyTracker {
  private readonly maxSamples: number;
  private samples: number[] = [];

  constructor(maxSamples: number) {
    this.maxSamples = Math.max(1, Math.floor(maxSamples));
  }

  record(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    this.samples.push(durationMs);
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples);
    }
  }

  snapshot(): LatencySummary {
    const n = this.samples.length;
    if (n === 0) {
      return {
        count: 0,
        minMs: null,
        maxMs: null,
        avgMs: null,
        p50Ms: null,
        p75Ms: null,
        p95Ms: null,
        p99Ms: null,
      };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
      count: n,
      minMs: sorted[0] ?? null,
      maxMs: sorted[n - 1] ?? null,
      avgMs: Math.round((sum / n) * 100) / 100,
      p50Ms: percentile(sorted, 0.5),
      p75Ms: percentile(sorted, 0.75),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
    };
  }

  reset(): void {
    this.samples = [];
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return Math.round(sorted[idx]! * 100) / 100;
}
